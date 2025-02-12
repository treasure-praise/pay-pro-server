const { PrismaClient, Savings, TransactionType,Decimal } = require('@prisma/client');

const calculateDailyInterest = (savings) => {
  const balance = new Decimal(savings.currentBalance);
  const dailyRate = new Decimal(savings.interestRate)
    .dividedBy(365)
    .dividedBy(100);
  
  return balance.mul(dailyRate);
};

const processSingleSavingsInterest = async (
    prisma,
    savings
  ) => {
    const interestAmount = calculateDailyInterest(savings);
    
    if (interestAmount.equals(0)) {
      return;
    }
  
    // Check if we have the wallet information
    if (!savings.user?.wallet?.id) {
      console.error(`No wallet found for savings ${savings.id}`);
      return;
    }
  
    try {
      await prisma.$transaction(async (tx) => {
        // Create interest log
        await tx.interestLog.create({
          data: {
            savingsId: savings.id,
            amount: interestAmount,
            calculatedAt: new Date(),
            appliedAt: new Date()
          }
        });
  
        // Update savings balance
        await tx.savings.update({
          where: { id: savings.id },
          data: {
            currentBalance: {
              increment: interestAmount
            }
          }
        });
  
        // Record transaction with the correct wallet ID
        await tx.savingsTransaction.create({
          data: {
            savingsId: savings.id,
            amount: interestAmount,
            type: TransactionType.CREDIT,
            walletId: savings.user.wallet.id, // Now we have the wallet ID
            description: 'Daily interest credit'
          }
        });
      });
  
      console.log(`Processed interest for savings ${savings.id}: ${interestAmount}`);
    } catch (error) {
      console.error(`Error processing interest for savings ${savings.id}:`, error);
    }
  };

const processAllDailyInterest = async (prisma) => {
  console.log('Starting daily interest calculation...');
  
  const activeSavings = await prisma.savings.findMany({
    where: {
      status: 'ACTIVE',
      currentBalance: { gt: 0 },
      maturityDate: { gt: new Date() }
    },
    include: {
        category: true,
        user: {
          include: {
            wallet: true
          }
        }
      }
  });

  for (const savings of activeSavings) {
    await processSingleSavingsInterest(prisma, savings);
  }
};

module.exports= { processAllDailyInterest };
