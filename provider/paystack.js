const axios = require('axios');

const baseUrl = 'https://api.paystack.co';
const secretKey = process.env.PAYSTACK_SECRET_KEY;

const initializePayment = async (email, amount) => {
  try {
    const response = await axios.post(
      `${baseUrl}/transaction/initialize`,
      {
        email,
        amount: amount * 100, // Convert to kobo
        // callback_url: `${process.env.BASE_URL}/api/webhook/paystack`,
        callback_url: `${process.env.DEV_URL}/dashboard`,
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Paystack initialization failed: ${error.message}`);
  }
};

const verifyTransaction = async (reference) => {
  try {
    const response = await axios.get(`${baseUrl}/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(`Transaction verification failed: ${error.message}`);
  }
};

const getBanks = async () => {
  try {
    const response = await axios.get(`${baseUrl}/bank`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch banks: ${error.message}`);
  }
};

const resolveAccount = async (accountNumber, bankCode) => {
  try {
    const response = await axios.get(
      `${baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Account resolution failed: ${error.message}`);
  }
};

const createTransferRecipient = async (name, accountNumber, bankCode) => {
  try {
    const response = await axios.post(
      `${baseUrl}/transferrecipient`,
      {
        type: 'nuban',
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Transfer recipient creation failed: ${error.message}`);
  }
};

const initiateTransfer = async (amount, recipient, reference) => {
  try {
    const response = await axios.post(
      `${baseUrl}/transfer`,
      {
        source: 'balance',
        amount: amount * 100,
        recipient,
        reference,
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Transfer initiation failed: ${error.message}`);
  }
};

module.exports = {
  initializePayment,
  verifyTransaction,
  getBanks,
  resolveAccount,
  createTransferRecipient,
  initiateTransfer,
};