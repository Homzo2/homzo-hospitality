const fs = require('fs');
const path = require('path');
const { sequelize } = require('./db');

// List of CSV files to clear (keeping only headers)
const csvFilesToClear = [
  'properties_database.csv',
  'reviews_database.csv',
  'clients_database.csv',
  'payouts_database.csv',
  'tasks_database.csv',
  'inquiries_database.csv',
  'tickets_database.csv',
  'applications_database.csv',
  'notifications_database.csv',
  'city_approval_queue_database.csv',
  'city_status_history_database.csv',
  'permission_changelog_database.csv'
];

function clearCsvFiles() {
  console.log('--- Clearing Dummy Data in CSV Files ---');
  csvFilesToClear.forEach(file => {
    const csvPath = path.resolve(__dirname, file);
    if (fs.existsSync(csvPath)) {
      try {
        const content = fs.readFileSync(csvPath, 'utf8');
        const firstLine = content.split('\n')[0]; // Extract headers
        fs.writeFileSync(csvPath, firstLine + '\n', 'utf8');
        console.log(`Cleared CSV: ${file}`);
      } catch (err) {
        console.error(`Failed to clear CSV ${file}:`, err.message);
      }
    }
  });
}

async function clearDb() {
  console.log('--- Force Syncing Database (Clearing all tables) ---');
  try {
    // Force sync drops all tables and recreates them
    await sequelize.sync({ force: true });
    console.log('Successfully dropped and recreated empty database tables.');
  } catch (err) {
    console.error('Failed to force sync database:', err.message);
  }
}

async function run() {
  clearCsvFiles();
  await clearDb();
  console.log('\n======================================================');
  console.log('🎉 Database and CSV files have been cleared of dummy data!');
  console.log('Please push these changes to GitHub and Render will redeploy.');
  console.log('======================================================\n');
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error during clean:', err);
  process.exit(1);
});
