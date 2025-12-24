// TechnicalEvaluation.js
// Criterion-by-criterion scoring

const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const TechnicalEvaluation = sequelize.define('TechnicalEvaluation', {
  submission_id: { type: DataTypes.INTEGER, allowNull: false },
  criteria: { type: DataTypes.JSON },
  score: { type: DataTypes.FLOAT },
  passed: { type: DataTypes.BOOLEAN, defaultValue: false }
});

module.exports = TechnicalEvaluation;
