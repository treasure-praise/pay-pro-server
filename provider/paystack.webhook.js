const { PrismaClient,Decimal } = require("@prisma/client");
const { logger } = require("../services/logger");
const prisma = new PrismaClient();

async function handleTransferSuccess(data) {
    try {
        await prisma.$transaction(async (tx) => {
            // Find the pending provider transaction
            const transaction = await tx.providerTransaction.findFirst({
                where: {
                  OR: [
                    {
                      reference: data.reference,
                      type: 'WITHDRAWAL',
                      status: 'PENDING'
                    },
                    {
                      providerReference: data.transfer_code,
                      type: 'WITHDRAWAL',
                      status: 'PENDING'
                    }
                  ]
                }
              });
              console.log('Found transaction:', transaction);
        
            if (!transaction) {
              throw new Error('Transaction not found, No matching transaction found for reference', data.reference);
              return;
            }
        
            // Update provider transaction status
            await tx.providerTransaction.update({
              where: { id: transaction.id },
              data: { 
                status: 'COMPLETED',
                providerReference: data.transfer_code // Add Paystack's transfer reference
              }
            });
        
            // Update internal account transaction status if needed
            await tx.transaction.updateMany({
              where: {
                walletId: transaction.walletId,
                type: 'DEBIT', // Use correct enum value
                status: 'PENDING'
              },
              data: { 
                status: 'COMPLETED'
              }
            });
          });
    } catch (error) {
        logger.error('Transfer success handling failed', {
            error: error.message,
            data: event.data
          });
    }
  
}

async function handleTransferFailed(data) {
  await prisma.$transaction(async (tx) => {
    // Find the pending provider transaction
    const transaction = await tx.providerTransaction.findFirst({
      where: {
        reference: data.reference,
        type: 'WITHDRAWAL',
        status: 'PENDING'
      }
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Get user with wallet and tier info
    const user = await tx.user.findUnique({
      where: { email: transaction.email },
      include: { 
        wallet: {
          include: { tier: true }
        }
      }
    });

    if (!user || !user.wallet) {
      throw new Error('User wallet not found');
    }

    // Find internal payable account
    const payableAccount = await tx.internalAccount.findFirst({
      where: { type: 'PAYABLE' }
    });

    if (!payableAccount) {
      throw new Error('Payable account not configured');
    }

    // Reset daily debit used if needed
    const updatedDailyDebitUsed = user.wallet.dailyDebitUsed.sub(transaction.amount);

    // Reverse the withdrawal
    await Promise.all([
      // Update provider transaction status
      tx.providerTransaction.update({
        where: { id: transaction.id },
        data: { 
          status: 'FAILED',
          providerReference: data.transfer_code
        }
      }),

      // Refund user wallet and update limits
      tx.wallet.update({
        where: { id: user.wallet.id },
        data: { 
          balance: { increment: transaction.amount },
          dailyDebitUsed: updatedDailyDebitUsed
        }
      }),

      // Credit internal payable account back
      tx.internalAccount.update({
        where: { id: payableAccount.id },
        data: { balance: { increment: transaction.amount } }
      }),

      // Create refund transaction
      tx.transaction.create({
        data: {
          walletId: user.wallet.id,
          type: 'CREDIT', // Use correct enum value
          amount: transaction.amount,
          status: 'COMPLETED',
          description: 'Failed Withdrawal Refund',
          email: user.email
        }
      }),

      // Update original debit transaction
      tx.transaction.updateMany({
        where: {
          walletId: user.wallet.id,
          type: 'DEBIT',
          status: 'PENDING'
        },
        data: { 
          status: 'FAILED'
        }
      })
    ]);
  });
}

async function handleChargeSuccess(data) {
  await prisma.$transaction(async (tx) => {
    // Find the pending provider transaction
    const transaction = await tx.providerTransaction.findFirst({
      where: {
        reference: data.reference,
        type: 'FUNDING',
        status: 'PENDING'
      }
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Get user with wallet and tier info
    const user = await tx.user.findUnique({
      where: { email: transaction.email },
      include: { 
        wallet: {
          include: { tier: true }
        }
      }
    });

    if (!user || !user.wallet) {
      throw new Error('User wallet not found');
    }

    // Check if funding would exceed wallet tier limit
    const newBalance = (user.wallet.balance).add(transaction.amount);
    if (newBalance.gt(user.wallet.tier.maxBalance)) {
      console.log( user.wallet.balance, "this is the current balance of the wallet");
      console.log(newBalance, "this is what the new balance would be if funding is successful");
      console.log( user.wallet.tier.maxBalance, "this is the max balance this wallet tier can hold");
      
      throw new Error('Funding would exceed wallet tier limit');
    }

    // Find internal receivable account
    const receivableAccount = await tx.internalAccount.findFirst({
      where: { type: 'RECEIVABLE' }
    });

    if (!receivableAccount) {
      throw new Error('Receivable account not configured');
    }

    await Promise.all([
      // Update provider transaction
      tx.providerTransaction.update({
        where: { id: transaction.id },
        data: { 
          status: 'COMPLETED',
          providerReference: data.reference
        }
      }),

      // Credit user wallet
      tx.wallet.update({
        where: { id: user.wallet.id },
        data: { balance: { increment: transaction.amount } }
      }),

      // Credit internal receivable account
      tx.internalAccount.update({
        where: { id: receivableAccount.id },
        data: { balance: { increment: transaction.amount } }
      }),

      // Create user credit transaction
      tx.transaction.create({
        data: {
          walletId: user.wallet.id,
          type: 'CREDIT',
          amount: transaction.amount,
          status: 'COMPLETED',
          description: 'Wallet Funding',
          email: user.email
        }
      })
    ]);
  });
}

module.exports = { handleChargeSuccess, handleTransferFailed, handleTransferSuccess };