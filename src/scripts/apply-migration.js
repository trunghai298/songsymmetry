const { execSync } = require('child_process');
const path = require('path');

/**
 * Script to apply the custom timestamp migration
 */
function applyMigration() {
  try {
    console.log('Applying timestamp migration...');
    
    // Get the project root directory
    const projectRoot = path.resolve(__dirname, '../..');
    
    // Change to project root directory
    process.chdir(projectRoot);
    
    // Execute the migration SQL directly
    const result = execSync(`
      npx prisma db execute --file=./prisma/migrations/20250521_add_timestamps/migration.sql
    `, { encoding: 'utf-8' });
    
    console.log('Migration applied successfully!');
    console.log(result);
    
    // Update the Prisma client to match the new schema
    console.log('Generating updated Prisma client...');
    execSync('npx prisma generate', { encoding: 'utf-8' });
    
    console.log('Prisma client updated successfully!');
    
    return true;
  } catch (error) {
    console.error('Error applying migration:', error);
    return false;
  }
}

// Run the migration if called directly
if (require.main === module) {
  const success = applyMigration();
  process.exit(success ? 0 : 1);
}

module.exports = { applyMigration };