const { initSchema } = require('../db');

module.exports = async () => {
  await initSchema();
};
