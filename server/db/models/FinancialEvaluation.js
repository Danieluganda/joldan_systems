// FinancialEvaluation.js
// Price comparison & scoring

const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const FinancialEvaluation = sequelize.define('FinancialEvaluation', {
  submission_id: { type: DataTypes.INTEGER, allowNull: false },
  price: { type: DataTypes.FLOAT },
  score: { type: DataTypes.FLOAT },
  currency: { type: DataTypes.STRING },
  passed: { type: DataTypes.BOOLEAN, defaultValue: false }
});

module.exports = FinancialEvaluation;
