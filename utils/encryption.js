const crypto = require("crypto")

class Encryption {
    static algorithm = "aes-256-gcm";
    static keyLength =32;
    static ivLength= 12

    static generateKey(secret){
        return crypto.scryptSync(secret,"salt", this.keyLength)
    }

    static encrypt(text) {
        const key = this.generateKey(process.env.ENCRYPTION_KEY);
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, key, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        
        // Return everything we need for decryption
        return {
          encrypted,
          iv: iv.toString('hex'),
          authTag: authTag.toString('hex')
        };
      }
    
      static decrypt(encryptedData) {
        const key = this.generateKey(process.env.ENCRYPTION_KEY);
        const decipher = crypto.createDecipheriv(
          this.algorithm,
          key,
          Buffer.from(encryptedData.iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }
}