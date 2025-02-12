const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient,TransactionType,SavingsStatus } = require('@prisma/client');
const { Encryption } = require("../utils/encryption");
const prisma = new PrismaClient();


const  login=async(email, password) =>{
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return { token,userId: user.id,
      email: user.email,
      name: user.name };
  }




  const signup=async(email, password, name)=> {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const tier1 = await prisma.walletTier.findFirst({
      where: { level: 'TIER_1' }
    });

    if (!tier1) {
      throw new Error("Wallet tier configuration not found");
    }

    return await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          kycLevel: 'TIER_1',
        },
      });

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

      return { 
        message: "User registered successfully",
        user: createdUser,
        wallet 
      };
    });
  }
const verifyBVN = async (bvn, email) => {
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
        throw new Error('Invalid BVN. Please provide a valid BVN.');
    }

    // Check for associated email address and confirm that KYC validated is false then update to true if BVN is correct
    try {
        const user = await prisma.user.findUnique({
            where: { email: email },
        });

        if (!user) {
            throw new Error('User not found with the provided email.');
        }

        if (user.isKYCValidated) {
            throw new Error('KYC has already been validated for this user.');
        }

        // Get TIER_2 limits
        const tier2 = await prisma.walletTier.findFirst({
            where: { level: 'TIER_2' }
        });

        if (!tier2) {
            throw new Error("Tier configuration not found");
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

        return {
            message: 'BVN verified and account upgraded to TIER_2',
            user: updatedUser.user,
            wallet: updatedUser.wallet
        };
    } catch (error) {
        throw new Error('An error occurred while verifying the BVN.');
    }
};

const getAllRecipients = async () => {
  try {
    const recipients = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        accountNo: true, // Corrected from "accountNumber"
        createdAt: true,
      },
    });

    return recipients;
  } catch (error) {
    throw new Error('An error occurred while fetching recipients.');
  }
};


module.exports = { login, signup ,verifyBVN, getAllRecipients};