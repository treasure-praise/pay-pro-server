const { PrismaClient,TransactionType,SavingsStatus } = require('@prisma/client');
const prisma = new PrismaClient();
const WalletService = require('./Wallet.service');
const { Decimal } = require('@prisma/client/runtime/library');

// Savings.service.js
const createSavings = async (savingsData) => {
    const { userId, categoryId, targetAmount, maturityDate, type, name, autoSave, autoSaveAmount, frequencyType } = savingsData;

    // validate if savings category exists
    const category = await prisma.savingsCategory.findUnique({
        where: {
            id: categoryId
        }
    });

    if (!category) {
        throw new Error('Savings category not found');
    }

    // Validate amount limits
    if (targetAmount < category.minimumAmount || 
        (category.maximumAmount && targetAmount > category.maximumAmount)) {
        throw new Error('Target amount outside allowed range');
    }

    // Calculate and validate duration
    const durationDays = Math.ceil(
        (new Date(maturityDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    if (durationDays < category.minimumDuration ||
        (category.maximumDuration && durationDays > category.maximumDuration)) {
        throw new Error('Duration outside allowed range');
    }

    // Create the savings plan
    const savings = await prisma.savings.create({
        data: {
            name,
            type,
            targetAmount,
            maturityDate: new Date(maturityDate),
            interestRate: category.interestRate,
            categoryId,
            autoSave: autoSave || false,
            autoSaveAmount,
            frequencyType,
            userId
        }
    });

    return savings;
};


const depositToSavings = async (addFundsData,description) =>{
    const { userId, savingsId, amount } = addFundsData;
    const savings = await verifySavingsAccess(userId, savingsId);

   const wallet = await WalletService.getWalletByUserId(userId);
  
   
   if (wallet.balance.lt(amount)) {
       throw new Error('Insufficient funds');
   }

   return prisma.$transaction(async(tx)=>{
    //dedcut The amount from the wallet
    await WalletService.deductFromWallet(userId, amount);
    //Add the amount to the savings plan
    const updated= await tx.savings.update({
        where: {
            id: savingsId
        },
        data: {
            currentBalance: savings.currentBalance.add(amount)
        }
    })

    //log the savings transaction in databse
    await tx.savingsTransaction.create({
        data: {
            savingsId,
            amount,
            type: TransactionType.CREDIT,
            walletId: wallet.id,
            description: description || 'Savings deposit',
        }
    });

    return updated;

   })
}

const processAutoSave = async (prisma, savings) => {   
    const amount = new Decimal(savings.autoSaveAmount);     
    try {   
        const  addFundsData={ userId: savings.userId, savingsId: savings.id, amount };
       
        await depositToSavings(addFundsData, 'Auto-save deposit');  
        console.log(`Auto-save processed for savings ${savings.id}: ${amount}`);  
        
        // Update last auto-save date
        await prisma.savings.update({
            where: { id: savings.id },
            data: { lastAutoSaveDate: new Date() }
        });
    }   
    catch (error) {     
        // Record failed transaction        
        await prisma.savingsTransaction.create({
            data: { 
                savingsId: savings.id,
                amount, 
                type: TransactionType.CREDIT,
                walletId: savings.user.wallet.id,
                status: 'FAILED',
                description: `Auto-save failed - ${error.message}`,
            },      
        });
        console.error(`Auto-save failed for savings ${savings.id}:`, error);
    }
};



const processAllDueAutoSaves = async (prisma) => {
    console.log('Processing due auto-saves...');
    const getLastDueDate = () => {
        const now = new Date();
        // Set to previous day at 23:59:59
        now.setDate(now.getDate() - 1);
        now.setHours(23, 59, 59, 999);
        return now;
    };
    
    const lastDueDate = getLastDueDate();
    console.log('Last due date:', lastDueDate); // Debug timestamp

    const activeSavings = await prisma.savings.findMany({
        where: {
            status: SavingsStatus.ACTIVE,
            autoSave: true,
            autoSaveAmount: { not: null },
            OR: [
                { lastAutoSaveDate: { lt: lastDueDate } },
                { lastAutoSaveDate: null }
            ]
        },
        include: {
            user: {
                include: {
                    wallet: true
                }
            }
        }
    });

    // Debug output
    console.log('Query results:', JSON.stringify(activeSavings, null, 2));

    console.log(`Found ${activeSavings.length} due auto-saves`);

    for (const savings of activeSavings) {
        console.log(`Processing auto-save for savings ${savings.id}`);
        await processAutoSave(prisma, savings);
    }
};



const verifySavingsAccess = async (userId, savingsId) =>{
    const savings = await prisma.savings.findFirst({
        where: {
            id: savingsId,
            userId
        },
        include: {
            user: {  
                include: {
                    wallet: true
                }
            }
        }
    });
    if (!savings) {
        throw new Error('Savings plan not found');
    }
    if (savings.status !== 'ACTIVE') {
        throw new Error('Savings plan is not active');
    }
    // console.log(savings);
    
    return savings;
}


const withdrawFromSavings = async (withdrawData) =>{
    let { userId, savingsId, amount } = withdrawData;
    const savings = await verifySavingsAccess(userId, savingsId);
    const wallet = await WalletService.getWalletByUserId(userId);

    if (savings.currentBalance.lt(amount)) {
        throw new Error('Insufficient Savings Balance');    
    }

    let withdrawalAmount = amount;


       // Check if early withdrawal (for fixed savings)
    if (savings.type === 'FIXED' && new Date() < savings.maturityDate) {
        const category = await prisma.savingsCategory.findUnique({
            where: { id: savings.categoryId },
          });
    
        if (category && category.earlyWithdrawalPenalty > 0) {
            // Calculate penalty
            const penaltyRate = category.earlyWithdrawalPenalty;
            const penaltyAmount = amount * (penaltyRate/100);
            console.log(`this is the penalty rate ${penaltyRate}`);
            console.log(`this is the penalty amount${penaltyAmount}`);
            
            withdrawalAmount = amount - penaltyAmount;
            
            console.log(`Applying early withdrawal penalty: ${penaltyRate / 100}%`);
            console.log(`Original amount: ${amount}, After penalty: ${withdrawalAmount}`);
        }
    }
  
      return prisma.$transaction(async (tx) => {
        // Deduct from savings
        const updated = await tx.savings.update({
          where: { id: savingsId },
          data: { currentBalance: { decrement: withdrawalAmount } },
        });
  
        // Add to wallet
        await WalletService.addToWallet(userId, withdrawalAmount);
  
        // Record transaction
        await tx.savingsTransaction.create({
          data: {
            savingsId,
            amount:withdrawalAmount,
            type: TransactionType.DEBIT,
            walletId: wallet.id,
            description: amount !== withdrawalAmount 
                    ? `Savings withdrawal with early withdrawal penalty`
                    : 'Savings withdrawal',
          },
        });
  
        return updated;
      });
}

const stopSavingsPlan = async(stopData) =>{
const { userId, savingsId } = stopData;
  

    const savings = await verifySavingsAccess(userId, savingsId);
    
    // Withdraw all funds
    if (savings.currentBalance > 0) {
        let withdrawData = { userId, savingsId, amount: savings.currentBalance };
      await withdrawFromSavings(withdrawData);
    }

    return prisma.savings.update({
        where: {
            id: savingsId
        },
        data: {
            status: SavingsStatus.TERMINATED
        }
    });
}

const getAllSavings = async (userId) =>{
    return prisma.savings.findMany({
        where: {
            userId,
            status: SavingsStatus.ACTIVE
        }
    });
}

const savingsTransactions = async (savingsId) =>{
    return prisma.savingsTransaction.findMany({
        where: {
            savingsId
        }, 
        orderBy: {
            createdAt: 'desc',
          },
    });
}

const getSavingsCategories = async () => {
    return prisma.savingsCategory.findMany();
};


module.exports = {createSavings,depositToSavings,withdrawFromSavings,stopSavingsPlan, getAllSavings,savingsTransactions, processAllDueAutoSaves,getSavingsCategories}