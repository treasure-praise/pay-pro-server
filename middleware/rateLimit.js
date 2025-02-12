const rateLimit = require("express-rate-limit");

const rateLimiter = rateLimit({
    windowMs:parseInt(process.env.RATE_LIMIT_WINDOW_MS),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS),
  message: 'Too many requests from this IP, please try again later.'
})


module.exports={rateLimiter}