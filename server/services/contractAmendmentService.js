// contractAmendmentService.js
// Amendment tracking
const ContractAmendment = require('../db/models/ContractAmendment');

module.exports = {
  async addAmendment(data) {
    return ContractAmendment.create(data);
  },
  async getAmendments(contract_id) {
    return ContractAmendment.findAll({ where: { contract_id } });
  },
  async updateAmendment(id, data) {
    return ContractAmendment.update(data, { where: { id } });
  }
};
