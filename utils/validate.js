
const Joi = require('joi');

const savingsSchema = Joi.object({
    userId: Joi.string().required(),
    categoryId: Joi.string().required(),
    targetAmount: Joi.number().required(),
    maturityDate: Joi.date().required(),
    type: Joi.string().required(),
    name: Joi.string().required(),
    autoSave: Joi.boolean().required(),
    autoSaveAmount: Joi.number().when('autoSave', { is: true, then: Joi.required() }),
    frequencyType: Joi.string().required()
});

const addFundsSchema = Joi.object({
    userId: Joi.string().required(),
    savingsId: Joi.string().required(),
    amount: Joi.number().required()
});

module.exports = { savingsSchema, addFundsSchema };