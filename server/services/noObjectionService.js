// NoObjection Service
const NoObjection = require('../db/models/NoObjection');

module.exports = {
  async create(data) {
    return await NoObjection.create(data);
  },
  async getById(id) {
    return await NoObjection.findById(id).populate('requester procurementId comments.user');
  },
  async getByProcurement(procurementId) {
    return await NoObjection.find({ procurementId }).populate('requester comments.user');
  },
  async updateStatus(id, status, comment) {
    const noObj = await NoObjection.findById(id);
    if (!noObj) throw new Error('NoObjection not found');
    noObj.status = status;
    if (comment) noObj.comments.push(comment);
    noObj.updatedAt = Date.now();
    await noObj.save();
    return noObj;
  },
  async addComment(id, comment) {
    const noObj = await NoObjection.findById(id);
    if (!noObj) throw new Error('NoObjection not found');
    noObj.comments.push(comment);
    noObj.updatedAt = Date.now();
    await noObj.save();
    return noObj;
  }
};
