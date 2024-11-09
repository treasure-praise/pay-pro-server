const express = require ("express")
const helmet = require('helmet');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express()

app.use(express.json());
app.use(helmet());
app.use(rateLimiter);

app.get("/processTransaction",async(req,res)=>{
    const transaction = await prisma.transaction.create({
        data: {
          encryptedPan: "1212",
          encryptedExp: "2112",
          amount: 1000,
          status: 'PROCESSED'
        }
      });

    res.json({
        status:"success",
        transactionId: transaction.id,
    })
})

const PORT = process.env.PORT || 3000
app.listen(PORT,()=>{
    console.log(`Server started on Port ${PORT}`);
    
})