// Simple script to test Redis connectivity
const Redis = require('ioredis');

async function testRedis() {
  console.log('Testing Redis connectivity...');
  
  // Get Redis URL from environment
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('REDIS_URL environment variable is not defined.');
    process.exit(1);
  }
  
  // Hide password in logs if present
  const maskedUrl = redisUrl.includes('@') 
    ? redisUrl.replace(/\/\/([^:]+):[^@]+@/, '//***:***@') 
    : redisUrl;
  console.log(`Connecting to Redis at: ${maskedUrl}`);
  
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
    console.log('Setting test value...');
    await redis.set('test-key', 'Hello from SongSymmetry!');
    
    console.log('Getting test value...');
    const value = await redis.get('test-key');
    console.log(`Retrieved value: ${value}`);
    
    console.log('Running ping command...');
    const pingResult = await redis.ping();
    console.log(`Ping result: ${pingResult}`);
    
    // Get Redis info
    console.log('Getting Redis info...');
    const info = await redis.info();
    console.log('Redis info summary:');
    const serverSection = info.split('\n').filter(line => 
      line.includes('redis_version') || 
      line.includes('uptime_in_seconds') ||
      line.includes('connected_clients')
    );
    serverSection.forEach(line => console.log(`  ${line}`));
    
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
testRedis().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});