// debarredListService.js
// Check against debarred firms
const DebarredList = require('../db/models/DebarredList');

module.exports = {
  async checkFirm(name) {
    return DebarredList.findOne({ where: { firm_name: name } });
  },
  async addFirm(data) {
    return DebarredList.create(data);
  },
  async getDebarredList() {
    return DebarredList.findAll();
  }
};
