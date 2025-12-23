const { createStore } = require('./baseService');
const store = createStore('plans');
module.exports = {
  list: store.list,
  get: store.get,
  create: store.create,
  update: store.update,
  remove: store.remove,
};
