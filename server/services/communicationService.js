// communicationService.js
// Email/Bank communication log
const CommunicationLog = require('../db/models/CommunicationLog');

module.exports = {
  async logCommunication(data) {
    return CommunicationLog.create(data);
  },
  async getCommunications(procurement_id) {
    return CommunicationLog.findAll({ where: { procurement_id } });
  }
};
