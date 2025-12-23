/**
 * Database Migration Script
 * 
 * Run this script to set up the initial database schema
 * Usage: node migrations/001_initial_schema.js
 */

const { initializeDatabases, query, healthCheck, gracefulShutdown } = require('../index');

async function runMigration() {
  console.log('Starting database migration...');
  
  try {
    // First check database health
    const health = await healthCheck();
    if (health.status !== 'healthy') {
      throw new Error(`Database not healthy: ${health.error}`);
    }
    
    console.log('✅ Database connection healthy');
    console.log(`   PostgreSQL Version: ${health.database.pg_version.split(' ')[0]}`);
    console.log(`   Pool Status: ${health.pool.totalConnections} total, ${health.pool.idleConnections} idle`);
    
    // Run the initialization
    await initializeDatabases();
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Update your .env file with correct database credentials');
    console.log('   2. Change the default admin password');
    console.log('   3. Start your application server');
    console.log('   4. Access admin panel with: admin@procurement.local / Admin123!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await gracefulShutdown();
    process.exit(0);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };