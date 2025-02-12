const { logger } = require("../services/logger");
const WalletService = require("../services/Wallet.service");


const creditWallet = async (req, res) => {
    try {
        const { amount } = req.body;
        const  email  = req.user.email;
        const response = await WalletService.fundWallet( amount,email);
        logger.info("Wallet credited", { email, amount });
        res.json(response);
    } catch (error) {
        logger.error("Credit Operation failed", { error: error.message });
        res.status(500).json({ error: error.message });
    }
}

const debitWallet = async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const wallet = await WalletService.deductFromWallet(userId, amount);
        logger.info("Wallet debited", { userId, amount });
        res.json(wallet);
    } catch (error) {
        logger.error("Debit Operation failed", { error: error.message });
        res.status(500).json({ error: error.message });
    }
}

const getWalletBalance = async (req, res) => {
    try {
        const { userId } = req.params;
        const wallet = await WalletService.getWalletByUserId(userId);
        logger.info("Wallet balance retrieved", { userId });
        res.json(wallet);
    } catch (error) {
        logger.error("Error retrieving wallet balance", { error: error.message });
        res.status(500).json({ error: error.message });
    }
}

const transferToWallet = async (req, res) => { 
    try {
        const { senderId, receiverId, amount, description } = req.body;
        const result = await WalletService.transfer({
            senderId,
            receiverId,
            amount,
            description
          });

        logger.info("Wallet transfer successful", { senderId, receiverId, amount });
        res.json(result);
    } catch (error) {
        logger.error("Wallet transfer failed", { error: error.message });
        res.status(500).json({ error: error.message });
    }
 }
 
 const withdrawToBank = async (req, res) => {
    try {
        const { amount, description, accountNumber, bankCode } = req.body;
        const email = req.user.email;
        const wallet = await WalletService.withdrawToBankAccount(amount, description, accountNumber, bankCode,email);
        logger.info("Withdrawal to Bank Account successful", {email, amount });
        res.json(wallet);
    } catch (error) {
        logger.error("Withdrawal to Bank Account failed", { error: error.message,stack: error.stack,
            email,
            amount  });
        res.status(500).json({ error: error.message });
    }
 }

const getTransactionHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const transactions = await WalletService.getTransactionHistory(userId);
        logger.info("Transaction history retrieved", { userId });
        res.json(transactions);
    } catch (error) {
        logger.error("Error retrieving transaction history", { error: error.message });
        res.status(500).json({ error: error.message });
    }
}

const getSingleTransaction = async (req, res) => {  
    try {
        const { transactionId } = req.params;
        const transaction = await WalletService.getSingleTransaction(transactionId);
        logger.info("Transaction retrieved", { transactionId });    
        res.json(transaction);
    }   
    catch (error) {
        logger.error("Error retrieving transaction", { error: error.message });
        res.status(500).json({ error: error.message });
    }}
module.exports = { creditWallet,getTransactionHistory, debitWallet, getWalletBalance, transferToWallet,withdrawToBank,getSingleTransaction };