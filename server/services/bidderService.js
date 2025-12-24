// bidderService.js
// Supplier database management
const Bidder = require('../db/models/Bidder');

module.exports = {
  async createBidder(data) {
    return Bidder.create(data);
  },
  async getBidders() {
    return Bidder.findAll();
  },
  async updateBidder(id, data) {
    return Bidder.update(data, { where: { id } });
  }
};
