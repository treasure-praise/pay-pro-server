const SavingsService = require('../services/Savings.service');
const { logger } = require('../services/logger');




// Create a new savings
const createSavings= async(req, res) => {
    try {
        const { userId, categoryId, targetAmount, maturityDate, type, name, autoSave, autoSaveAmount, frequencyType } = req.body;

        const savingsData = { userId, categoryId, targetAmount, maturityDate, type, name, autoSave, autoSaveAmount, frequencyType };
        
        const savings = await SavingsService.createSavings(savingsData);
        logger.info('Savings plan created successfully', { userId, name });
    res.status(201).json({
            message: 'Savings plan created successfully',
            data: savings
        });
    } catch (error) {
        logger.error('Error creating savings:', error);
        return res.status(500).json({
            message: 'Failed to create savings plan',
            error: error.message
        });
    }
}

//fund a savings plan
const depositToSavings =  async (req, res) => {
    try {
        const { userId, savingsId, amount } = req.body;
        const AddFundsData ={ userId, savingsId, amount }
        const savings = await SavingsService.depositToSavings(AddFundsData);
        logger.info('Funds added to savings plan', { userId, savingsId });

        return res.status(200).json({
            message: 'Funds Added to savings plan',
            data: savings
        });
    } catch (error) {
            logger.error('Error adding funds to savings:', error);
        return res.status(500).json({
            message: 'Failed to Add Funds to savings plan',
            error: error.message
        });
    }
}

//withdwaw from a savings plan
const withdrawFromSavings= async(req, res) => {
    try {
        const { userId, savingsId, amount } = req.body;
        const withdrawData = { userId, savingsId, amount }
        const savings = await SavingsService.withdrawFromSavings(withdrawData);
        logger.info('Funds withdrawn from savings into Wallet', { userId, savingsId });
        res.status(200).json({
            message: 'Funds withdrawn from savings plan',
            data: savings
        });
    } catch (error) {
      logger.error('Error withdrawing from savings:', error);
        res.status(400).json({ message: error.message });
    }
}

//stop a savings plan
const stopSavingsPlan= async (req, res) => {
    try {
        const { userId, savingsId } = req.body;
        const stopData = { userId, savingsId }
        const savings = await SavingsService.stopSavingsPlan(stopData);
        logger.info('Savings stopped successfully', { userId, savingsId });
        res.status(200).json({
            message: 'Savings plan stopped successfully',
            data: savings.status
        });
    } catch (error) {
        logger.error('Error stopping savings:', error);
        res.status(400).json({ message: error.message });
    }
}

//get all savings plan for a user
const getSavings= async(req, res) => {

    try {
        const savings = await SavingsService.getAllSavings(req.params.userId);
        logger.info('Savings retrieved successfully', { userId: req.params.userId });
        res.status(200).json({
            message: 'Savings plan retrieved successfully',
            data: savings
        });
    } catch (error) {
        logger.error('Error retrieving savings:', error);
        res.status(400).json({ message: error.message });
    }
}

//get savings transaction history 
const savingsTransactions= async(req, res) => {
    try {
        const transactions = await SavingsService.savingsTransactions(req.params.savingsId);
        res.status(200).json({
            message: 'Savings transaction retrieved successfully',
            data: transactions
        });
    } catch (error) {
        logger.error('Error retrieving savings transaction:', error);
        res.status(400).json({ message: error.message });
    }
}

const getSavingsCategories= async(req,res)=> {
    try {
        const savingsCategories = await SavingsService.getSavingsCategories(req.params.savingsId);
        res.status(200).json({
            message: 'Savings Categories retrieved successfully',
            data: savingsCategories
        });
    } catch (error) {
        logger.error('Error retrieving savings categories:', error);
        res.status(400).json({ message: error.message });
    }
}




module.exports = {
    createSavings,
    depositToSavings,
    withdrawFromSavings,
    stopSavingsPlan,
    getSavings,
    savingsTransactions,
    getSavingsCategories
};