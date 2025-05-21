// Test a specific Redis connection
const Redis = require('ioredis');

async function testSpecificRedis() {
  console.log('Testing specific Redis connection...');
  
  // The specific Redis URL to test
  const redisUrl = 'redis://default:976d1f320c8642a09cee1016ae89d19f@fly-songsymmetry-redis.internal:6379';
  console.log(`Connecting to Redis at: ${redisUrl.replace(/\/\/([^:]+):[^@]+@/, '//***:***@')}`); // Hide password in logs
  
  // Create Redis client with timeout
  const redis = new Redis(redisUrl, {
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
  });
  
  // Handle connection errors
  redis.on('error', (err) => {
    console.error('Redis connection error:', err);
    process.exit(1);
  });
  
  try {
    // Test basic operations
    console.log('Running ping command...');
    const pingResult = await redis.ping();
    console.log(`Ping result: ${pingResult}`);
    
    console.log('\nRedis connection test successful!');
  } catch (error) {
    console.error('Redis test failed:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await redis.quit();
  }
}

// Run the test
testSpecificRedis().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});