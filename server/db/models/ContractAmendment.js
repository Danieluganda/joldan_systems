// ContractAmendment.js
// Unlimited contract amendments

const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const ContractAmendment = sequelize.define('ContractAmendment', {
  contract_id: { type: DataTypes.INTEGER, allowNull: false },
  amendment_date: { type: DataTypes.DATE, allowNull: false },
  description: { type: DataTypes.TEXT },
  value_change: { type: DataTypes.FLOAT },
  status: { type: DataTypes.STRING, defaultValue: 'active' }
});

module.exports = ContractAmendment;
