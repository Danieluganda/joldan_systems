// currencyService.js
// Exchange rate management
const Currency = require('../db/models/Currency');

module.exports = {
  async getRates() {
    return Currency.findAll();
  },
  async updateRate(code, rate) {
    return Currency.update({ exchange_rate: rate }, { where: { code } });
  }
};
