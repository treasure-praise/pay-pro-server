class TransactionService {
    constructor(prisma) {
      this.prisma = prisma;
    }
  
    async createTransaction({ pan, expiryDate, amount, email }) {
      const encryptedPan = Encryption.encrypt(pan);
      const encryptedExp = Encryption.encrypt(expiryDate);
  
      const transaction = await this.prisma.transaction.create({
        data: {
          email,
          encryptedPan: JSON.stringify(encryptedPan),
          maskedPan: Masking.maskPan(pan),
          encryptedExp: JSON.stringify(encryptedExp),
          amount,
          status: "PROCESSED",
        },
      });
  
      logger.info("Transaction processed", {
        transactionId: transaction.id,
        maskedPan: Masking.maskPan(pan),
        amount,
        status: "PROCESSED",
      });
  
      return transaction;
    }
  
    async getTransactionById(id) {
      const transaction = await this.prisma.transaction.findUnique({
        where: { id },
      });
  
      if (!transaction) return null;
  
      const decryptedPan = Encryption.decrypt(JSON.parse(transaction.encryptedPan));
      const decryptedExp = Encryption.decrypt(JSON.parse(transaction.encryptedExp));
  
      return {
        ...transaction,
        decryptedPan,
        decryptedExp,
      };
    }
  
    async getAllTransactions() {
      return await this.prisma.transaction.findMany();
    }
  }
  
  module.exports = TransactionService;