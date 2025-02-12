const cron = require("node-cron")
const { PrismaClient } = require('@prisma/client');
const {logger}  = require("./logger")

const prisma = new PrismaClient();


const ArchiveOldTransactions =async()=>{
    const duration = parseInt(process.env.ARCHIVING_DURATION, 10) || 180; // Default to 180 days (6 months)
  const archiveBeforeDate = new Date();
  archiveBeforeDate.setDate(archiveBeforeDate.getDate() - duration);

  console.log(`Archiving transactions created before: ${archiveBeforeDate}`);

   
   try {
    const oldTransactions = await prisma.transaction.findMany({
        where:{
            createdAt:{
                lt:archiveBeforeDate
            }
        }
    })

    console.log(`${oldTransactions.length} transactions found for archiving.`);
    logger.info(`${oldTransactions.length} transactions found for archiving.`);


   // If no transactions exist, exit
   if (oldTransactions.length === 0) {
    console.log("No transactions to archive.");
    logger.info("No transactions to archive.");
    return;
  }

    //if transactions exist, save them to Archiving Database
    await prisma.archivedTransactions.createMany({
        data:oldTransactions.map((transaction)=>({
                ...transaction,
            archivedAt: new Date()
        }))
    })
    console.log("Transactions successfully archived.");



    //delete already archived transactions
    const archivedIds = oldTransactions.map((transaction) => transaction.id);
    await prisma.transaction.deleteMany({
      where: {
        id: { in: archivedIds },
      },
    });
    console.log("Archived transactions deleted from the main database.");
    logger.info("Archived transactions deleted from the main database.");

    
   } catch (error) {
    console.log(error);
     logger.error('Error during archiving process', {
        error: error.message
      });
   }

   cron.schedule("*/1 * * * *",async()=>{
       try {
           logger.info('Starting scheduled archiving process');
           await ArchiveOldTransactions()
       } catch (error) {
           logger.error('Scheduled archiving failed', {
               error: error.message
             });
       }
   })

}


module.exports = ArchiveOldTransactions;
