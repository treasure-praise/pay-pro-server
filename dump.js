app.post("/login", async (req, res) => {
    const { email, password } = req.body;
  
    try {
      // Find the user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });
  
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
  
      // Verify the password
      const isPasswordValid = await bcrypt.compare(password, user.password);
  
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
  
      // Generate a JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h",
        }
      );
  
      res.json({ token });
    } catch (error) {
      console.error("Error during login:", error.message);
      res.status(500).json({ error: "An error occurred during login" });
    }
  });
  
  // Sign-Up Endpoint
  app.post("/signup", async (req, res) => {
    const { email, password, name } = req.body;
  
    try {
      // Check if the user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
  
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
       // Get TIER_1 limits
       const tier1 = await prisma.walletTier.findFirst({
        where: { level: 'TIER_1' }
      });
  
      if (!tier1) {
        return res.status(500).json({ message: "Wallet tier configuration not found" });
      }
  
      //Transaction to Create Wallet first then attach wallet to created user
      const newUser = await prisma.$transaction(async (tx) => {
        // Create a new user
        const createdUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            kycLevel: 'TIER_1',
          },
        });
  
        //create a wallet for the user
        const wallet = await tx.wallet.create({
          data: {
            userId: createdUser.id,
            balance: 0,
            debitLimit: tier1.dailyDebitLimit,
            creditLimit: tier1.maxBalance,
            tierId: tier1.id,
            dailyDebitUsed: 0,
            dailyTransferUsed: 0
          },
        });
  
        return { createdUser, wallet };
      });
  
      res.status(201).json({
        message: "User registered successfully",
        user: newUser.createdUser,
        wallet: newUser.wallet,
      });
    } catch (error) {
      console.error("Error creating user:", error.message);
      res
        .status(500)
        .json({ error: "An error occurred while creating the user" });
    }
  });

  //bvn verification
app.post("/verify-bvn",async(req,res)=>{
  const {bvn,email} = req.body
  const validBVNs = [
    '12345678901',
    '23456789012',
    '34567890123',
    '45678901234',
    '56789012345',
    '67890123456',
    '78901234567',
    '89012345678',
    '90123456789',
    '01234567890',
  ];
  
  // BVN validation function
  const isValidBVN = (bvn) => {
    return validBVNs.includes(bvn);
  };

  if (!isValidBVN(bvn)) {
    return res.status(400).json({ message: 'Invalid BVN. Please provide a valid BVN.' });
  }

  //check for assocaited email adddress and confirm that kycvalidated is false then update to true if bvn is correct 
  try {
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found with the provided email.' });
    }

    if (user.isKYCValidated) {
      return res.status(400).json({ message: 'KYC has already been validated for this user.' });
    }

    // Get TIER_2 limits
    const tier2 = await prisma.walletTier.findFirst({
      where: { level: 'TIER_2' }
    });

    if (!tier2) {
      return res.status(500).json({ message: "Tier configuration not found" });
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { email },
        data: {
          isKYCValidated: true,
          BVN: Encryption.encrypt(bvn),
          kycLevel: 'TIER_2'
        },
      });

      const wallet = await tx.wallet.update({
        where: { userId: user.id },
        data: {
          tierId: tier2.id,
          debitLimit: tier2.dailyDebitLimit,
          creditLimit: tier2.maxBalance
        },
      });

      return { user, wallet };
    });

    res.status(200).json({
      message: 'BVN verified and account upgraded to TIER_2',
      user: updatedUser.user,
      wallet: updatedUser.wallet
    });
  } catch (error) {
    console.error('Error during BVN verification:', error);
    return res.status(500).json({ message: 'An error occurred while verifying the BVN.' });
  }

  //An update to this is to use Paystack api to check against an account number https://paystack.com/docs/identity-verification/validate-customer/
})

//wallet transfer
app.post("/wallet-transfer", authenticateJWT, async (req, res) => {
  const { senderId, receiverId, amount, description } = req.body;

  if (!senderId || !receiverId || !amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid transfer details provided." });
  }


  
  try {
    // Execute everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const senderWallet = await tx.wallet.findUnique({
        where: { userId: senderId },
        include: {
           tier: true, // Include tier information
          user: {      // Include the related user
          select: {
            email: true, // Only include the user's email
          },
        },}, 
      });
      
      const receiverWallet = await tx.wallet.findUnique({
        where: { userId: receiverId },
        include: {
           tier: true, // Include tier information
           user: {      // Include the related user
          select: {
            email: true, // Only include the user's email
          },
        }, }, 
      });

      if (!senderWallet || !receiverWallet) {
        throw new Error("Sender or receiver wallet not found.");
      }

      // Check if sender has sufficient balance
if (new Decimal(senderWallet.balance).lt(new Decimal(amount))) {
  throw new Error("Insufficient balance in sender's wallet.");
}

// Check daily transfer limit
const dailyUsed = new Decimal(senderWallet.dailyTransferUsed || 0);
const dailyLimit = new Decimal(senderWallet.tier.dailyTransferLimit || 0);

if (dailyUsed.add(new Decimal(amount)).gt(dailyLimit)) {
  throw new Error("Daily transfer limit exceeded.");
}


      // Fetch internal accounts
      const [payableAccount, receivableAccount] = await Promise.all([
        tx.internalAccount.findFirst({
          where: { type: "PAYABLE" },
        }),
        tx.internalAccount.findFirst({
          where: { type: "RECEIVABLE" },
        }),
      ]);

      if (!payableAccount || !receivableAccount) {
        throw new Error("Internal accounts not configured.");
      }

      // Check receiver's wallet tier limit
const newReceiverBalance = new Decimal(receiverWallet.balance).add(new Decimal(amount));
const maxBalance = new Decimal(receiverWallet.tier.maxBalance);

if (newReceiverBalance.gt(maxBalance)) {
  throw new Error("Transfer would exceed receiver's wallet tier limit.");
}

      // Update sender's wallet
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: {
          balance: { decrement: amount },
          dailyTransferUsed: { increment: amount },
        },
      });

      // Update receiver's wallet
      await tx.wallet.update({
        where: { id: receiverWallet.id },
        data: { 
          balance: { increment: amount }
        },
      });

      // Update internal accounts
      await tx.internalAccount.update({
        where: { id: payableAccount.id },
        data: { balance: { decrement: amount } },
      });

      await tx.internalAccount.update({
        where: { id: receivableAccount.id },
        data: { balance: { increment: amount } },
      });

      // Create transactions
      await Promise.all([
        // Sender transaction
        tx.transaction.create({
          data: {
            email: senderWallet.user.email, // Make sure to include user email
            amount: -amount,
            type: "TRANSFER",
            status: "COMPLETED",
            description: `${description} to  ${receiverWallet.user.email}`,
            walletId: senderWallet.id,
          },
        }),
        // Receiver transaction
        tx.transaction.create({
          data: {
            email: receiverWallet.user.email, // Make sure to include user email
            amount: amount,
            type: "CREDIT",
            status: "COMPLETED",
            description: `${description} from ${senderWallet.user.email}`,
            walletId: receiverWallet.id,
          },
        }),
      ]);
    });

    res.json({ message: "Transfer successful." });
  } catch (error) {
    console.error("Error during wallet transfer:", error);
    res.status(400).json({ message: error.message });
  } finally {
    await prisma.$disconnect();
  }
});


// Withdrawal endpoint
app.post('/withdraw', authenticateJWT, async (req, res) => {
  const { amount, description, accountNumber, bankCode } = req.body;
  const email = req.user.email;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get user with wallet and tier info
      const user = await tx.user.findUnique({
        where: { email },
        include: { 
          wallet: {
            include: { tier: true }
          }
        }
      });

      if (!user || !user.wallet) {
        throw new Error('User wallet not found');
      }

      console.log(user.wallet.balance , "walletBalance");
      console.log(amount , "amount");

  // Convert to Decimal for proper comparison
  const walletBalance = new Decimal(user.wallet.balance);
  const withdrawalAmount = new Decimal(amount);
  const dailyDebitUsed = new Decimal(user.wallet.dailyDebitUsed);
  const dailyDebitLimit = new Decimal(user.wallet.tier.dailyDebitLimit);

  // Check sufficient balance
  if (walletBalance.lessThan(withdrawalAmount)) {
    throw new Error(`Insufficient wallet balance. Available: ${walletBalance}, Requested: ${withdrawalAmount}`);
  }

  // Check daily debit limit
  const newDailyDebitUsed = dailyDebitUsed.plus(withdrawalAmount);
  if (newDailyDebitUsed.greaterThan(dailyDebitLimit)) {
    throw new Error(`Daily withdrawal limit exceeded. Limit: ${dailyDebitLimit}, Used: ${dailyDebitUsed}, Requested: ${withdrawalAmount}`);
  }


      // Find internal payable account
      const payableAccount = await tx.internalAccount.findFirst({
        where: { type: 'PAYABLE' }
      });

      if (!payableAccount) {
        throw new Error('Payable account not configured');
      }

      // Create transfer recipient first
      const transferRecipient = await createTransferRecipient(email, accountNumber, bankCode);
      if (!transferRecipient.status || !transferRecipient.data.recipient_code) {
        throw new Error('Failed to create transfer recipient');
      }

      // Initiate transfer
      const transferResult = await initiateTransfer(amount, transferRecipient.data.recipient_code);
      if (!transferResult.status || !transferResult.data.reference) {
        throw new Error('Failed to initiate transfer');
      }

      // Create pending provider transaction with reference
      const providerTransaction = await tx.providerTransaction.create({
        data: {
          amount,
          type: 'WITHDRAWAL',
          status: 'PENDING',
          provider: 'PAYSTACK',
          email,
          reference: transferResult.data.reference,
          providerReference: transferResult.data.transfer_code
        }
      });

      // Debit user wallet and update daily limit
      await tx.wallet.update({
        where: { id: user.wallet.id },
        data: { 
          balance: { decrement: amount },
          dailyDebitUsed: newDailyDebitUsed
        }
      });

      // Debit internal payable account
      await tx.internalAccount.update({
        where: { id: payableAccount.id },
        data: { balance: { decrement: amount } }
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          walletId: user.wallet.id,
          type: 'DEBIT',
          amount: amount, // Don't make negative, amount is already absolute
          status: 'PENDING', // Set as PENDING until webhook confirms
          description: description || 'Wallet Withdrawal',
          email
        }
      });

      return {
        message: 'Withdrawal initiated successfully',
        transactionId: providerTransaction.id,
        reference: transferResult.data.reference
      };
    });

    res.json(result);
  } catch (error) {
    logger.error('Withdrawal failed', { 
      error: error.message,
      stack: error.stack,
      email,
      amount 
    });

    // Return appropriate error messages
    if (error.message.includes('limit exceeded')) {
      return res.status(400).json({ 
        message: 'Daily withdrawal limit exceeded',
        error: error.message 
      });
    }

    if (error.message.includes('insufficient')) {
      return res.status(400).json({ 
        message: 'Insufficient balance',
        error: error.message 
      });
    }

    res.status(500).json({ 
      message: 'Withdrawal failed',
      error: error.message 
    });
  }
});


//wallet balance
app.get("/wallet-balance/:userId", authenticateJWT, async (req, res) => {
  try {
    const userId = req.params.userId;

    const walletBalance = await prisma.wallet.findUnique({
      where: {
        userId: userId,
      },
      select: {
        balance: true,
      },
    });

    if (walletBalance) {
      return res.json({ balance: walletBalance.balance });
    } else {
      return res.status(404).json({ message: "Wallet not found for the given user." });
    }
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    res.status(500).json({ message: "An error occurred while fetching the wallet balance." });
  }
});

//fund wallet
app.post('/fund', authenticateJWT, async (req, res) => {
  const { amount } = req.body;
  const  email  = req.user.email;

  

  try {
    const providerTransaction = await prisma.providerTransaction.create({
      data: {
        amount,
        type: 'FUNDING',
        status: 'PENDING',
        provider: 'PAYSTACK',
        email
      }
    });

    const paystackResponse = await initializePayment(
      email,
      amount
    );

    await prisma.providerTransaction.update({
      where: { id: providerTransaction.id },
      data: {
        reference: paystackResponse.data.reference,
        providerReference: paystackResponse.data.reference
      }
    });

    res.json({
      message: 'Payment initialization successful',
      checkoutUrl: paystackResponse.data.authorization_url,
      reference: paystackResponse.data.reference
    });
  } catch (error) {
    logger.error('Payment initialization failed', { error: error.message });
    res.status(500).json({ message: error.message });
  }
});



////////////////////////////////////////////////////////////////

//Create Transaction
app.post(
  "/processTransaction",
  authenticateJWT,
  validateCard,
  async (req, res) => {
    try {
      const { pan, expiryDate, amount, email } = req.body;

      // Encrypt sensitive data
      const encryptedPan = Encryption.encrypt(pan);
      const encryptedExp = Encryption.encrypt(expiryDate);

      // Store transaction
      const transaction = await prisma.transaction.create({
        data: {
          email: email,
          encryptedPan: JSON.stringify(encryptedPan),
          maskedPan: Masking.maskPan(pan),
          encryptedExp: JSON.stringify(encryptedExp),
          amount: amount,
          status: "PROCESSED",
        },
      });

      // Log transaction (with masked data)
      logger.info("Transaction processed", {
        transactionId: transaction.id,
        maskedPan: Masking.maskPan(pan),
        amount: amount,
        status: "PROCESSED",
      });

      res.json({
        transactionId: transaction.id,
        status: "PROCESSED",
      });
    } catch (error) {
      logger.error("Transaction failed", {
        error: error.message,
      });
      res.status(500).json({ error: "Transaction processing failed" });
    }
  }
);

//Get Unique Transaction
app.get("/transaction/:id", authenticateJWT, async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Decrypt data for processing
    const decryptedPan = Encryption.decrypt(
      JSON.parse(transaction.encryptedPan)
    );
    const decryptedExp = Encryption.decrypt(
      JSON.parse(transaction.encryptedExp)
    );

    res.json({
      id: transaction.id,
      email: transaction.email,
      decryptedPan,
      decryptedExp,
      maskedPan: transaction.maskedPan,
      amount: transaction.amount,
      status: transaction.status,
      createdAt: transaction.createdAt,
    });
  } catch (error) {
    logger.error("Error retrieving transaction", {
      error: error.message,
    });
    res.status(500).json({ error: "Error retrieving transaction" });
  }
});

//get All Transactions
app.get("/", authenticateJWT, async (req, res) => {
  try {
    const allTransactions = await prisma.transaction.findMany();
    res.json(allTransactions);
  } catch (error) {
    console.log(error);
    
  }
});



app.post('/credit', authenticateJWT, async (req, res) => {
  const { walletId, amount,email } = req.body;


  

  if (amount <= 0) {
    return res.status(400).json({ message: 'Credit amount must be greater than zero.' });
  }

  try {
    const result = await prisma.$transaction(async (prisma) => {
      const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });

      if (!wallet) {
        throw new Error('Wallet not found.');
      }

      if (wallet.creditLimit > 0 && wallet.balance + amount > wallet.creditLimit) {
        throw new Error('Credit amount exceeds wallet credit limit.');
      }

      const updatedWallet = await prisma.wallet.update({
        where: { id: walletId },
        data: { balance: wallet.balance + amount },
      });

      await prisma.transaction.create({
        data: {
          walletId,
          email,
          type: 'CREDIT',
          amount,
          description: 'Wallet Credited',
          createdAt: new Date(),
        },
      });

      return updatedWallet;
    });

    res.json({ message: 'Wallet credited successfully.', newBalance: result.balance });
  } catch (error) {
    res.status(500).json({ message: error.message || 'An error occurred while processing the request.' });
  }
});

app.post('/debit', authenticateJWT, async (req, res) => { 
  const { walletId, amount, description, accountNumber, bankCode } = req.body;

  if (amount <= 0) {
    return res.status(400).json({ message: 'Debit amount must be greater than zero.' });
  }

  try {
    const result = await prisma.$transaction(async (prisma) => {
      const wallet = await prisma.wallet.findUnique({ where: { id: walletId }, include: { user: true,tier: true  }  });

      

      if (!wallet) {
        throw new Error('Wallet not found.');
      }
      await checkTransactionLimits(wallet, amount, 'DEBIT')

      if (wallet.balance < amount) {
        throw new Error('Insufficient funds.');
      }

      if (amount > wallet.debitLimit) {
        throw new Error('Amount exceeds debit limit.');
      }

      const updatedWallet = await prisma.wallet.update({
        where: { id: walletId },
        data: { balance: parseFloat(wallet.balance) - parseFloat(amount),
          dailyDebitUsed:parseFloat(wallet.dailyDebitUsed) + parseFloat(amount)
         },
      });

      await prisma.transaction.create({
        data: {
          walletId,
          type: 'DEBIT',
          amount,
          description: description || 'Wallet Debited',
          status: 'COMPLETED',
          email:wallet.user.email
        },
      });

      //paystack transfer to account      
     const transferRecipient= await createTransferRecipient(wallet.user.name, accountNumber, bankCode)
    
    
     const transferResult= await initiateTransfer(amount, transferRecipient.data.recipient_code,   )
     console.log(transferResult);
      return updatedWallet;
    });

    res.json({ 
      message: 'Wallet debited successfully.',
      newBalance: result.balance 
    });
  } catch (error) {
    logger.error('Debit operation failed', { error: error.message });
    res.status(500).json({ message: error.message });
  }
});
