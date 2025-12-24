// noticeService.js
// GPN/SPN publication
const ProcurementNotice = require('../db/models/ProcurementNotice');

module.exports = {
  async createNotice(data) {
    return ProcurementNotice.create(data);
  },
  async getNotices(procurement_id) {
    return ProcurementNotice.findAll({ where: { procurement_id } });
  },
  async updateNotice(id, data) {
    return ProcurementNotice.update(data, { where: { id } });
  }
};
