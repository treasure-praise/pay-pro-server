import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // ... you will write your Prisma Client queries here
  // const allUsers = await prisma.Transaction.findMany()
  // console.log(allUsers)


  await prisma.transaction.create({
    data: {
      encryptedPan: "1212",
      encryptedExp: "2112",
      amount: 1000,
      status: 'PROCESSED'
    }
  });

  const allTransactions = await prisma.transaction.findMany()
  console.dir(allTransactions, { depth: null })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })