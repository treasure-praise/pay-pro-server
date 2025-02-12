const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { PrismaClient, Decimal } = require("@prisma/client");
const prisma = new PrismaClient();
const { rateLimiter } = require("./middleware/rateLimit");
const { logger } = require("./services/logger");
const crypto = require('crypto');
const router = require("./routes");
const { handleTransferSuccess, handleChargeSuccess, handleTransferFailed } = require("./provider/paystack.webhook");
const ArchiveOldTransactions = require("./services/archiving");
const { initializeSavingsWorkers } = require("./jobs/savingsWorker");

const app = express();

app.use(cors())
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Allow cookies & authentication headers
  })
)
app.use(express.json());
app.use(helmet());
app.use(rateLimiter);

app.use('/api', router);

app.post("/api/webhook/paystack",  async(req, res)=> {
  try {
    const signature = req.headers['x-paystack-signature'];
    const body = JSON.stringify(req.body);
    
    const hmac = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(body).digest('hex');
    
    if (signature !== hmac) {
      return res.sendStatus(400); // Invalid signature, reject the request
    }
    const event = req.body;
    logger.error('Webhook event received:', {
      event: event.event,
      reference: event.data.reference,
      transferCode: event.data.transfer_code,
      status: event.data.status
    });
    
    switch(event.event) {
      case 'transfer.success':
        await handleTransferSuccess(event.data);
        break;
      case 'charge.success':
          await handleChargeSuccess(event.data);
          break;  
      case 'transfer.failed':
        await handleTransferFailed(event.data);
        break;
      default:
        console.log(`Unhandled event type: ${event.event}`);
    }
    return res.sendStatus(200);
  }
  catch (error) {
    logger.error('Webhook processing failed', { error: error.message,stack: error.stack  });
    res.sendStatus(500);
  }
});

// Handle unmatched routes
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});


initializeSavingsWorkers(prisma); 
// ArchiveOldTransactions()




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on Port ${PORT}`);
});
