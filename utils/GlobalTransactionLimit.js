// Helper function for checking global transaction limits
const isGlobalTransactionAllowed = async (amount) => {
    // Implement logic to check transaction limits (mocked as true for demo purposes)
    return true;
  };


  const getTierLimits = async (kycLevel) => {
    const tier = await prisma.walletTier.findFirst({
      where: { level: kycLevel }
    });
    
    if (!tier) {
      throw new Error('Invalid tier level');
    }
    
    return tier;
  };


//   checkKYCTier
  
  const checkTransactionLimits = async (wallet, amount, type) => {
    const tier = await getTierLimits(wallet.tier.level);
    
    // Check wallet balance limit
    if (type === 'CREDIT' && parseFloat(wallet.balance) + parseFloat(amount) > parseFloat(tier.maxBalance)) {
      throw new Error(`Transaction would exceed maximum balance limit of ${tier.maxBalance}`);
    }
  
    // Check daily debit limit
    if (type === 'DEBIT' && parseFloat(wallet.dailyDebitUsed) + parseFloat(amount) > parseFloat(tier.dailyDebitLimit)) {
      throw new Error(`Transaction would exceed daily debit limit of ${tier.dailyDebitLimit}`);
    }
  
    // Check daily transfer limit
    if (type === 'TRANSFER' && parseFloat(wallet.dailyTransferUsed) + parseFloat(amount) > parseFloat(tier.dailyTransferLimit)) {
      throw new Error(`Transaction would exceed daily transfer limit of ${tier.dailyTransferLimit}`);
    }
  
    return true;
  };

  module.exports={isGlobalTransactionAllowed, checkTransactionLimits,getTierLimits}