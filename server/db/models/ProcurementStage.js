// ProcurementStage.js
// 15 stages with planned/actual dates

const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const ProcurementStage = sequelize.define('ProcurementStage', {
  procurement_id: { type: DataTypes.INTEGER, allowNull: false },
  stage_name: { type: DataTypes.STRING, allowNull: false },
  planned_date: { type: DataTypes.DATE },
  actual_date: { type: DataTypes.DATE },
  status: { type: DataTypes.STRING, defaultValue: 'pending' }
});

module.exports = ProcurementStage;
