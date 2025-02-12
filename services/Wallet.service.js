const { PrismaClient,Decimal } = require('@prisma/client');
const { logger } = require('./logger');
const { initializePayment, createTransferRecipient, initiateTransfer } = require('../provider/paystack');


const prisma = new PrismaClient();


    async function getWalletByUserId(userId) {
        try {
            const wallet = await prisma.wallet.findUnique({
                where: {
                    userId: userId,
                },
            });
            return wallet;
        } catch (error) {
            console.error('Error retrieving wallet:', error);
            throw new Error('Could not retrieve wallet');
        }
    }


    async function deductFromWallet(userId, amount) {
        try {
            const wallet = await prisma.wallet.findUnique({
                where: {
                    userId: userId,
                },
            });

            if (!wallet) {
                throw new Error('Wallet not found');
            }

            if (wallet.balance.lt(amount)) {
                throw new Error('Insufficient balance');
            }

            const updatedWallet = await prisma.wallet.update({
                where: {
                    userId: userId,
                },
                data: {
                    balance: wallet.balance.sub(amount)
                },
            });

            return updatedWallet;
        } catch (error) {
            console.error('Error deducting from wallet:', error);
            throw new Error('Could not deduct from wallet');
        }
    }


    async function addToWallet(userId, amount) {
      console.log("userId",userId);
      
        try {
            const wallet = await prisma.wallet.findUnique({
                where: {
                    userId: userId,
                },
            });

            if (!wallet) {
                throw new Error('Wallet not found');
            }

            const updatedWallet = await prisma.wallet.update({
                where: {
                    userId: userId,
                },
                data: {
                    balance: wallet.balance.add(amount)
                },
            });

            return updatedWallet;
        } catch (error) {
            console.error('Error adding to wallet:', error);
            throw new Error('Could not add to wallet');
        }
    }

    async function transfer({ senderId, receiverId, amount, description }) {
        try {
           // Execute everything in a transaction
               const result = await prisma.$transaction(async (tx) => {
                 const senderWallet = await tx.wallet.findUnique({
                   where: { userId: senderId },
                   include: {
                      tier: true, // Include tier information
                     user: {      // Include the related user
                     select: {
                       email: true, // Only include the user's email
                     },
                   },}, 
                 });
                 
                 const receiverWallet = await tx.wallet.findUnique({
                   where: { userId: receiverId },
                   include: {
                      tier: true, // Include tier information
                      user: {      // Include the related user
                     select: {
                       email: true, // Only include the user's email
                     },
                   }, }, 
                 });
           
                 if (!senderWallet || !receiverWallet) {
                   throw new Error("Sender or receiver wallet not found.");
                 }
           
                 // Check if sender has sufficient balance
           if (new Decimal(senderWallet.balance).lt(new Decimal(amount))) {
             throw new Error("Insufficient balance in sender's wallet.");
           }
           
           // Check daily transfer limit
           const dailyUsed = new Decimal(senderWallet.dailyTransferUsed || 0);
           const dailyLimit = new Decimal(senderWallet.tier.dailyTransferLimit || 0);
           
           if (dailyUsed.add(new Decimal(amount)).gt(dailyLimit)) {
             throw new Error("Daily transfer limit exceeded.");
           }
           
           
                 // Fetch internal accounts
                 const [payableAccount, receivableAccount] = await Promise.all([
                   tx.internalAccount.findFirst({
                     where: { type: "PAYABLE" },
                   }),
                   tx.internalAccount.findFirst({
                     where: { type: "RECEIVABLE" },
                   }),
                 ]);
           
                 if (!payableAccount || !receivableAccount) {
                   throw new Error("Internal accounts not configured.");
                 }
           
                 // Check receiver's wallet tier limit
           const newReceiverBalance = new Decimal(receiverWallet.balance).add(new Decimal(amount));
           const maxBalance = new Decimal(receiverWallet.tier.maxBalance);
           
           if (newReceiverBalance.gt(maxBalance)) {
             throw new Error("Transfer would exceed receiver's wallet tier limit.");
           }
           
                 // Update sender's wallet
                 await tx.wallet.update({
                   where: { id: senderWallet.id },
                   data: {
                     balance: { decrement: amount },
                     dailyTransferUsed: { increment: amount },
                   },
                 });
           
                 // Update receiver's wallet
                 await tx.wallet.update({
                   where: { id: receiverWallet.id },
                   data: { 
                     balance: { increment: amount }
                   },
                 });
           
                 // Update internal accounts
                 await tx.internalAccount.update({
                   where: { id: payableAccount.id },
                   data: { balance: { decrement: amount } },
                 });
           
                 await tx.internalAccount.update({
                   where: { id: receivableAccount.id },
                   data: { balance: { increment: amount } },
                 });
           
                 // Create transactions
                 await Promise.all([
                   // Sender transaction
                   tx.transaction.create({
                     data: {
                       email: senderWallet.user.email, // Make sure to include user email
                       amount: -amount,
                       type: "TRANSFER",
                       status: "COMPLETED",
                       description: `${description} to  ${receiverWallet.user.email}`,
                       walletId: senderWallet.id,
                     },
                   }),
                   // Receiver transaction
                   tx.transaction.create({
                     data: {
                       email: receiverWallet.user.email, // Make sure to include user email
                       amount: amount,
                       type: "CREDIT",
                       status: "COMPLETED",
                       description: `${description} from ${senderWallet.user.email}`,
                       walletId: receiverWallet.id,
                     },
                   }),
                 ]);
               });
           
            
            return {
              message: "Transfer successful",
            }
        } catch (error) {
            console.error('Error performing Intra-Wallet Transfer:', error);
            throw new Error('Could not transfer funds');
        }
    }


    async function withdrawToBankAccount( amount ,description, accountNumber, bankCode,email) {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // Get user with wallet and tier info
                const user = await tx.user.findUnique({
                  where: { email },
                  include: { 
                    wallet: {
                      include: { tier: true }
                    }
                  }
                });
          
                if (!user || !user.wallet) {
                  throw new Error('User wallet not found');
                }
          
                console.log(user.wallet.balance , "walletBalance");
                console.log(amount , "amount");
          
            // Convert to Decimal for proper comparison
            const walletBalance = new Decimal(user.wallet.balance);
            const withdrawalAmount = new Decimal(amount);
            const dailyDebitUsed = new Decimal(user.wallet.dailyDebitUsed);
            const dailyDebitLimit = new Decimal(user.wallet.tier.dailyDebitLimit);
          
            // Check sufficient balance
            if (walletBalance.lessThan(withdrawalAmount)) {
              throw new Error(`Insufficient wallet balance. Available: ${walletBalance}, Requested: ${withdrawalAmount}`);
            }
          
            // Check daily debit limit
            const newDailyDebitUsed = dailyDebitUsed.plus(withdrawalAmount);
            if (newDailyDebitUsed.greaterThan(dailyDebitLimit)) {
              throw new Error(`Daily withdrawal limit exceeded. Limit: ${dailyDebitLimit}, Used: ${dailyDebitUsed}, Requested: ${withdrawalAmount}`);
            }
          
          
                // Find internal payable account
                const payableAccount = await tx.internalAccount.findFirst({
                  where: { type: 'PAYABLE' }
                });
          
                if (!payableAccount) {
                  throw new Error('Payable account not configured');
                }
          
                // Create transfer recipient first
                const transferRecipient = await createTransferRecipient(email, accountNumber, bankCode);
                if (!transferRecipient.status || !transferRecipient.data.recipient_code) {
                  throw new Error('Failed to create transfer recipient');
                }
          
                // Initiate transfer
                const transferResult = await initiateTransfer(amount, transferRecipient.data.recipient_code);
                if (!transferResult.status || !transferResult.data.reference) {
                  throw new Error('Failed to initiate transfer');
                }
          
                // Create pending provider transaction with reference
                const providerTransaction = await tx.providerTransaction.create({
                  data: {
                    amount,
                    type: 'WITHDRAWAL',
                    status: 'PENDING',
                    provider: 'PAYSTACK',
                    email,
                    reference: transferResult.data.reference,
                    providerReference: transferResult.data.transfer_code
                  }
                });
          
                // Debit user wallet and update daily limit
                await tx.wallet.update({
                  where: { id: user.wallet.id },
                  data: { 
                    balance: { decrement: amount },
                    dailyDebitUsed: newDailyDebitUsed
                  }
                });
          
                // Debit internal payable account
                await tx.internalAccount.update({
                  where: { id: payableAccount.id },
                  data: { balance: { decrement: amount } }
                });
          
                // Create transaction record
                await tx.transaction.create({
                  data: {
                    walletId: user.wallet.id,
                    type: 'DEBIT',
                    amount: amount, // Don't make negative, amount is already absolute
                    status: 'PENDING', // Set as PENDING until webhook confirms
                    description: description || 'Wallet Withdrawal',
                    email
                  }
                });
          
                return {
                  message: 'Withdrawal initiated successfully',
                  transactionId: providerTransaction.id,
                  reference: transferResult.data.reference
                };
              }, {
    timeout: 10000 
  });
          return result
        } catch (error) {
            console.error('Error withdrawing to bank account:', error);
            throw new Error('Could not withdraw to bank account');
        }
    }


    async function fundWallet(amount,email) {
      try {
        return await prisma.$transaction(async (tx) => {
          //  Create a provider transaction with PENDING status
          const providerTransaction = await tx.providerTransaction.create({
            data: {
              amount,
              type: 'FUNDING',
              status: 'PENDING',
              provider: 'PAYSTACK',
              email
            }
          });
    
          //  Initialize payment with Paystack
          const paystackResponse = await initializePayment(email, amount);
    
          //  Update the provider transaction with Paystack reference
          await tx.providerTransaction.update({
            where: { id: providerTransaction.id },
            data: {
              reference: paystackResponse.data.reference,
              providerReference: paystackResponse.data.reference
            }
          });
    
          return {
            message: 'Payment initialization successful',
            checkoutUrl: paystackResponse.data.authorization_url,
            reference: paystackResponse.data.reference
          };
        });
      } catch (error) {
        logger.error('Payment initialization failed', { error: error.message });
        throw new Error('Failed to fund wallet');
      }
    }

    async function getTransactionHistory(userId) {
      try {
        const transactions = await prisma.transaction.findMany({
          where: {
            walletId: userId,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
        return transactions;
      } catch (error) {
        console.error('Error retrieving transaction history:', error);
        throw new Error('Could not retrieve transaction history');
      }
    }

    async function getSingleTransaction(transactionId) { 
      try {
          const transaction = await prisma.transaction.findUnique({
              where: {
                  id: transactionId,
              },
          });
          return transaction;
      } catch (error) {
          console.error('Error retrieving transaction:', error);
          throw new Error('Could not retrieve transaction');
      }
    }

    module.exports = { getWalletByUserId, deductFromWallet, addToWallet,transfer,fundWallet,withdrawToBankAccount,getTransactionHistory,getSingleTransaction };



