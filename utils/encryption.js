// src/utils/encryption.js
const crypto = require('crypto');

class Encryption {
  static algorithm = 'aes-256-gcm';
  static keyLength = 32;
  static ivLength = 12;

  // Modified key generation to ensure correct length
  static getKey() {
    // If using a hex string in .env
    if (process.env.ENCRYPTION_KEY.length === 64) { // 32 bytes in hex = 64 characters
      return Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    }
    // If using a base64 string in .env
    if (process.env.ENCRYPTION_KEY.length === 44) { // 32 bytes in base64 = 44 characters
      return Buffer.from(process.env.ENCRYPTION_KEY, 'base64');
    }
    // If using a regular string, hash it to ensure proper length
    return crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest();
  }

  static encrypt(text) {
    try {
      const key = this.getKey();
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      
      // return {
      //   encrypted,
      //   iv: iv.toString('hex'),
      //   authTag: authTag.toString('hex')
      // };
      return `${encrypted}:${iv.toString('hex')}:${authTag.toString('hex')}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  static decrypt(encryptedData) {
    try {
      const key = this.getKey();
      const [encrypted, iv, authTag] = encryptedData.split(':');
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        key,
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
}

module.exports = {Encryption};