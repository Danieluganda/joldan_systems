// stageService.js
// Track 15 workflow stages
const ProcurementStage = require('../db/models/ProcurementStage');

module.exports = {
  async addStage(data) {
    return ProcurementStage.create(data);
  },
  async getStages(procurement_id) {
    return ProcurementStage.findAll({ where: { procurement_id } });
  },
  async updateStage(id, data) {
    return ProcurementStage.update(data, { where: { id } });
  }
};
