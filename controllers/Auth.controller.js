const { PrismaClient } = require("@prisma/client");
const AuthService = require("../services/Auth.service");
const { logger } = require("../services/logger");


const login = async (req, res) => { 
    try {
        const { email, password } = req.body;
        const result = await AuthService.login(email, password);
        logger.info("User logged in", { email });
        res.json(result);
      } catch (error) {
        logger.error("Login failed", { error: error.message });
        res.status(401).json({ message: error.message });
      }
}


const  signup= async(req, res)=> {
    try {
      const { email, password, name } = req.body;
      const result = await AuthService.signup(email, password, name);
      logger.info("User signed up", { email });
      res.status(201).json(result);
    } catch (error) {
      logger.error("Signup failed", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

 const  verifyBVN= async(req, res)=> {
    try {
      const { bvn, email } = req.body;
      const result = await AuthService.verifyBVN(bvn, email);
      logger.info(`BVN verified, Upgraded to ${result.user.kycLevel} `, { email });
      res.json(result);
    } catch (error) {
      logger.error("BVN verification failed", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

 
  const getRecipients = async (req, res) => {
    try {
      const recipients = await AuthService.getAllRecipients();
      logger.info("Recipients retrieved");
      res.json(recipients);
    } catch (error) {
      logger.error("Failed to get recipients", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  };

  const getRecipient = async (req, res) => {
    try {
      const { recipientId } = req.params;
      const recipient = await AuthService.getRecipientById(recipientId);
      if (!recipient) {
        logger.warn("Recipient not found", { recipientId });
        return res.status(404).json({ message: "Recipient not found" });
      }
      logger.info("Recipient retrieved", { recipientId });
      res.json(recipient);
    } catch (error) {
      logger.error("Failed to get recipient", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  };

  module.exports = { login, signup, verifyBVN, getRecipient, getRecipients };



 