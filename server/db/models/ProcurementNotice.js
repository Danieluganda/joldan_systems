// ProcurementNotice.js
// GPN and SPN tracking

const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const ProcurementNotice = sequelize.define('ProcurementNotice', {
  procurement_id: { type: DataTypes.INTEGER, allowNull: false },
  notice_type: { type: DataTypes.STRING, allowNull: false }, // GPN or SPN
  publication_date: { type: DataTypes.DATE },
  outlet: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'draft' }
});

module.exports = ProcurementNotice;
