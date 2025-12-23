// server/index.js
let express;
try{
  express = require('express');
}catch(e){
  console.error('\nMissing dependency: express is not installed.');
  console.error('Run `npm install` in the project root to install server dependencies.\n');
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => res.send('Procurement Discipline App API'));

// Register API routes (best-effort; missing files will throw)
try{
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/plans', require('./routes/plans'));
  app.use('/api/templates', require('./routes/templates'));
  app.use('/api/rfqs', require('./routes/rfqs'));
  app.use('/api/clarifications', require('./routes/clarifications'));
  app.use('/api/documents', require('./routes/documents'));
  app.use('/api/submissions', require('./routes/submissions'));
  app.use('/api/evaluations', require('./routes/evaluations'));
  app.use('/api/approvals', require('./routes/approvals'));
  app.use('/api/awards', require('./routes/awards'));
  app.use('/api/contracts', require('./routes/contracts'));
  app.use('/api/audits', require('./routes/audits'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/logs', require('./routes/logs'));
}catch(e){
  console.warn('Warning: some routes could not be registered —', e.message);
}

// Error handler
if (require.resolve){
  try{
    const errHandler = require('./middleware/errorHandler');
    app.use(errHandler);
  }catch(e){ /* ignore */ }
}

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Procurement Discipline App API listening on port ${port}`);
  });
}

module.exports = app;
