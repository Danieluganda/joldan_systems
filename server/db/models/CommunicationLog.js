// CommunicationLog.js
// Email/Bank communication trail

const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const CommunicationLog = sequelize.define('CommunicationLog', {
  procurement_id: { type: DataTypes.INTEGER },
  sender: { type: DataTypes.STRING },
  receiver: { type: DataTypes.STRING },
  message: { type: DataTypes.TEXT },
  date_sent: { type: DataTypes.DATE },
  channel: { type: DataTypes.STRING } // Email, Bank, etc.
});

module.exports = CommunicationLog;
