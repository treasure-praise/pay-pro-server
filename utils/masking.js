class Masking {
    static maskPan(pan) {
      return pan.slice(-4).padStart(pan.length, '*');
    }
  
    static maskExpiryDate(expiryDate) {
      return '**/**';
    }
  }

  module.exports = {Masking};