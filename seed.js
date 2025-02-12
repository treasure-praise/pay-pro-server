// seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const walletTiers = [
    {
      level: 'TIER_1',
      maxBalance: 50000,
      dailyDebitLimit: 20000,
      dailyTransferLimit: 20000,
      monthlyTransferLimit: 200000,
      description: 'Basic tier - No KYC required',
    },
    {
      level: 'TIER_2',
      maxBalance: 200000,
      dailyDebitLimit: 50000,
      dailyTransferLimit: 50000,
      monthlyTransferLimit: 500000,
      description: 'Intermediate tier - BVN verified',
    },
    {
      level: 'TIER_3',
      maxBalance: 1000000,
      dailyDebitLimit: 200000,
      dailyTransferLimit: 200000,
      monthlyTransferLimit: 2000000,
      description: 'Advanced tier - NIN verified',
    },
  ];

  for (const tier of walletTiers) {
    await prisma.walletTier.create({
      data: {
        ...tier,
      },
    });
  }

  console.log('WalletTiers added successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });