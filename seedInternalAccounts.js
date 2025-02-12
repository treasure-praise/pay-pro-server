const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// async function seedInternalAccounts() {
//     try {
//       const payableAccount = await prisma.internalAccount.upsert({
//         where: { type: "PAYABLE" },
//         update: {},
//         create: {
//           type: "PAYABLE",
//           balance: 100000.0,
//         },
//       });
  
//       const receivableAccount = await prisma.internalAccount.upsert({
//         where: { type: "RECEIVABLE" },
//         update: {},
//         create: {
//           type: "RECEIVABLE",
//           balance: 100000.0,
//         },
//       });
  
//       console.log("Internal accounts seeded:", {
//         payableAccount,
//         receivableAccount,
//       });
//     } catch (error) {
//       console.error("Error seeding internal accounts:", error);
//     } finally {
//       await prisma.$disconnect();
//     }
//   }
  
//   seedInternalAccounts();

// await prisma.internalAccount.createMany({
//     data: [
//       { type: "PAYABLE", balance: 0 },
//       { type: "RECEIVABLE", balance: 0 },
//     ],
//     skipDuplicates: true, // Avoid inserting duplicates
//   });