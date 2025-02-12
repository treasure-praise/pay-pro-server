const validateDeposit = (savings, amount) => {
    if (!savings) {
        return { code: 'NOT_FOUND', message: 'Savings plan not found' };
    }

    if (savings.category && amount.lessThan(savings.category.minimumAmount)) {
        return {
            code: 'INVALID_AMOUNT',
            message: `Minimum deposit amount is ${savings.category.minimumAmount}`
        };
    }

    return null;
};

const processDeposit = async (prisma, userId, savingsId, amount) => {
    const savings = await prisma.savings.findFirst({
        where: { id: savingsId, userId },
        include: { category: true }
    });

    const validationError = validateDeposit(savings, amount);
    if (validationError) {
        throw new Error(validationError.message);
    }

    return prisma.$transaction(async (tx) => {
        // First deduct from wallet
        await deductBalance(prisma, userId, amount);

        // Then add to savings
        const updatedSavings = await tx.savings.update({
            where: { id: savingsId },
            data: {
                currentBalance: { increment: amount }
            }
        });

        // Record transaction
        await tx.savingsTransaction.create({
            data: {
                savingsId,
                amount,
                type: 'CREDIT',
                walletId: await getWalletId(prisma, userId),
                description: 'Savings deposit'
            }
        });

        return updatedSavings;
    });
};

const processAutoSave = async (prisma, savings) => {
    if (!savings.autoSave || !savings.autoSaveAmount) {
        return;
    }

    const amount = new Decimal(savings.autoSaveAmount);
    
    try {
        await processDeposit(prisma, savings.userId, savings.id, amount);
        
        // Update last auto-save date
        await prisma.savings.update({
            where: { id: savings.id },
            data: { lastAutoSaveDate: new Date() }
        });
    } catch (error) {
        // Record failed transaction
        await prisma.savingsTransaction.create({
            data: {
                savingsId: savings.id,
                amount,
                type: 'CREDIT',
                walletId: await getWalletId(prisma, savings.userId),
                status: 'FAILED',
                description: `Auto-save failed - ${error.message}`
            }
        });
        
        console.error(`Auto-save failed for savings ${savings.id}:`, error);
    }
};

const getLastDueDate = () => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    return now;
};

const processAllDueAutoSaves = async (prisma) => {
    const dueAutoSaves = await prisma.savings.findMany({
        where: {
            status: 'ACTIVE',
            autoSave: true,
            OR: [
                { lastAutoSaveDate: null },
                {
                    lastAutoSaveDate: {
                        lt: getLastDueDate()
                    }
                }
            ]
        }
    });

    for (const savings of dueAutoSaves) {
        await processAutoSave(prisma, savings);
    }
};

module.exports = {
    processDeposit,
    processAutoSave,
    processAllDueAutoSaves
};
