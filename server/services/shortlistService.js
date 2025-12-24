// shortlistService.js
// Pre-qualification management
const Shortlist = require('../db/models/Shortlist');

module.exports = {
  async addToShortlist(data) {
    return Shortlist.create(data);
  },
  async getShortlist(procurement_id) {
    return Shortlist.findAll({ where: { procurement_id } });
  },
  async updateShortlist(id, data) {
    return Shortlist.update(data, { where: { id } });
  }
};
