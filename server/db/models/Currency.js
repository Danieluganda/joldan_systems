// Currency.js
// Exchange rate tracking

const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Currency = sequelize.define('Currency', {
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  name: { type: DataTypes.STRING },
  exchange_rate: { type: DataTypes.FLOAT },
  last_updated: { type: DataTypes.DATE }
});

module.exports = Currency;
