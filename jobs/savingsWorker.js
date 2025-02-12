const cron = require("node-cron");
const { processAllDailyInterest } = require("../services/InterestCalculationService");
const { processAllDueAutoSaves } = require("../services/Savings.service");

const initializeSavingsWorkers = (prisma) => {
    // Process interest every minute for demo purpose
    cron.schedule('* * * * *', () => {
        processAllDailyInterest(prisma);
    });

    // Process auto-saves every minute for demo purpose
    cron.schedule('* * * * *', () => {
        processAllDueAutoSaves(prisma);
    });
};

module.exports = { initializeSavingsWorkers };
