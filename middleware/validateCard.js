const validateCard = (req, res, next) => {
    const { pan, expiryDate, amount } = req.body;
    
    // Basic validation
    if (!pan || !expiryDate || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
  
    // Luhn algorithm check for PAN
    const isValidPan = pan.replace(/\D/g, '').split('')
      .reverse()
      .map(x => parseInt(x))
      .map((x, idx) => idx % 2 ? x * 2 : x)
      .map(x => x > 9 ? (x % 10) + 1 : x)
      .reduce((acc, x) => acc + x) % 10 === 0;
  
    if (!isValidPan) {
      return res.status(400).json({ error: 'Invalid card number' });
    }
  
    // Expiry date validation (MM/YY format)
    const expiryPattern = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
    if (!expiryPattern.test(expiryDate)) {
      return res.status(400).json({ error: 'Invalid expiry date format' });
    }
  
    const [month, year] = expiryDate.split('/');
    const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
    if (expiry < new Date()) {
      return res.status(400).json({ error: 'Card has expired' });
    }

    const amountPattern = /^\d+(\.\d{1,2})?$/;
    if (typeof amount !== 'number' || amount < 0 || !amountPattern.test(amount.toString())) {
      return res.status(400).json({ error: 'Invalid amount. Must be a non-negative number with up to two decimal places.' });
    }
  
  
    next();
  };

  module.exports={validateCard}