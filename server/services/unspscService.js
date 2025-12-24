// unspscService.js
// UNSPSC code hierarchy
const UNSPSCCode = require('../db/models/UNSPSCCode');

module.exports = {
  async getCodes(parent_code = null) {
    return UNSPSCCode.findAll({ where: { parent_code } });
  },
  async addCode(data) {
    return UNSPSCCode.create(data);
  },
  async searchCode(code) {
    return UNSPSCCode.findOne({ where: { code } });
  }
};
