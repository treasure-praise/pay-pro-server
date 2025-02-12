const express = require('express');
const router = express.Router();
// const TransactionController = require('../controllers/Transaction.controller');
const AuthController = require('../controllers/Auth.controller');
const WalletController = require('../controllers/Wallet.controller');
const  authenticateJWT  = require('../middleware/auth');

const SavingsController = require('../controllers/Savings.controller');
const validate = require('../middleware/validate');
const { savingsSchema, addFundsSchema } = require('../utils/validate');

// Transaction routes
// router.post('/processTransaction', authenticateJWT, validateCard, TransactionController.processTransaction);
// router.get('/transaction/:id', authenticateJWT, TransactionController.getTransaction);
// router.get('/transactions', authenticateJWT, TransactionController.getAllTransactions);

// Auth routes
router.post('/login', AuthController.login);
router.post('/signup', AuthController.signup);
router.post('/verify-bvn', AuthController.verifyBVN);

// Wallet routes
router.post('/fund', authenticateJWT, WalletController.creditWallet);
router.post('/withdraw', authenticateJWT, WalletController.withdrawToBank);
router.get('/wallet-balance/:userId', authenticateJWT, WalletController.getWalletBalance);
router.post('/wallet-transfer', authenticateJWT, WalletController.transferToWallet);
router.get('/wallet-transacitons', authenticateJWT, WalletController.getTransactionHistory);
router.get('/wallet-transaction/:transactionId', authenticateJWT, WalletController.getSingleTransaction);

//Savings routes
router.post('/savings/create', authenticateJWT,validate(savingsSchema), SavingsController.createSavings);
router.post('/savings/deposit', authenticateJWT,validate(addFundsSchema), SavingsController.depositToSavings);
router.get('/savings/user/:userId', authenticateJWT, SavingsController.getSavings);
router.post('/savings/withdraw', authenticateJWT, SavingsController.withdrawFromSavings);    
router.post('/savings/stop', authenticateJWT, SavingsController.stopSavingsPlan);    
router.get('/savings/:savingsId/transactions', authenticateJWT, SavingsController.savingsTransactions); 

//miscellaneous
router.get('/recipients',authenticateJWT,AuthController.getRecipients)
router.get('/savings-categories',authenticateJWT,SavingsController.getSavingsCategories)


module.exports = router;
