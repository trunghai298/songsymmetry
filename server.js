const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Create a global socket instance
let io;

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // Special handling for socket.io endpoint
      const parsedUrl = parse(req.url, true);
      
      // Let Next.js handle the request
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Initialize Socket.IO
  io = new Server(server, {
    path: '/api/socketio',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Setup Socket.IO event handlers
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    // Station events
    socket.on('join-station', (stationId, userId, callback) => {
      console.log(`User ${userId} joined station ${stationId}`);
      
      // Debug: Check room membership before joining
      const roomBefore = io.sockets.adapter.rooms.get(`station:${stationId}`);
      const countBefore = roomBefore ? roomBefore.size : 0;
      console.log(`Room station:${stationId} has ${countBefore} members before join`);
      
      // Join the room
      socket.join(`station:${stationId}`);
      
      // Debug: Check room membership after joining
      const roomAfter = io.sockets.adapter.rooms.get(`station:${stationId}`);
      const countAfter = roomAfter ? roomAfter.size : 0;
      console.log(`Room station:${stationId} now has ${countAfter} members after join`);
      
      // Broadcast to other room members - key issue might be here
      // Using io.to() instead of socket.to() to broadcast to ALL sockets in room
      console.log(`Broadcasting 'user-joined' event to room station:${stationId}`);
      io.to(`station:${stationId}`).emit('user-joined', { 
        userId, 
        socketId: socket.id, 
        timestamp: new Date().toISOString() 
      });
      
      // If callback provided, execute it to confirm join
      if (typeof callback === 'function') {
        callback();
      }
    });
    
    socket.on('leave-station', (stationId, userId, callback) => {
      console.log(`User ${userId} left station ${stationId}`);
      
      // Debug: Check room membership before leaving
      const roomBefore = io.sockets.adapter.rooms.get(`station:${stationId}`);
      const countBefore = roomBefore ? roomBefore.size : 0;
      console.log(`Room station:${stationId} has ${countBefore} members before leave`);
      
      // Leave the room
      socket.leave(`station:${stationId}`);
      
      // Debug: Check room membership after leaving
      const roomAfter = io.sockets.adapter.rooms.get(`station:${stationId}`);
      const countAfter = roomAfter ? roomAfter.size : 0;
      console.log(`Room station:${stationId} now has ${countAfter} members after leave`);
      
      // Broadcast to ALL clients in the room
      console.log(`Broadcasting 'user-left' event to room station:${stationId}`);
      io.to(`station:${stationId}`).emit('user-left', { 
        userId, socketId: socket.id, timestamp: new Date().toISOString() 
      });
      
      // Call the callback if provided
      if (typeof callback === 'function') {
        callback();
      }
    });
    
    socket.on('add-track', (data) => {
      console.log(`User ${data.userId} added track to station ${data.stationId}`);
      
      // Debug room membership
      const room = io.sockets.adapter.rooms.get(`station:${data.stationId}`);
      const memberCount = room ? room.size : 0;
      console.log(`Room station:${data.stationId} has ${memberCount} members when adding track`);
      
      // Notice we're using io.to() for broadcasting to everyone INCLUDING the sender
      console.log(`Broadcasting 'track-added' event to all members in room station:${data.stationId}`);
      io.to(`station:${data.stationId}`).emit('track-added', {
        userId: data.userId,
        track: data.track,
        timestamp: new Date().toISOString()
      });
    });
    
    socket.on('playback-update', (data) => {
      socket.to(`station:${data.stationId}`).emit('playback-updated', {
        userId: data.userId,
        state: data.state,
        timestamp: new Date().toISOString()
      });
    });

    // Chat events
    socket.on('send-message', (data) => {
      console.log(`User ${data.userId} sent message to station ${data.stationId}: ${data.message}`);
      
      // Broadcast message to all users in this station
      io.to(`station:${data.stationId}`).emit('new-message', {
        userId: data.userId,
        userName: data.userName,
        message: data.message,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('typing-start', (data) => {
      console.log(`User ${data.userId} started typing in station ${data.stationId}`);
      
      // Broadcast typing indicator to others in station (excluding sender)
      socket.to(`station:${data.stationId}`).emit('user-typing', {
        userId: data.userId,
        userName: data.userName,
        isTyping: true,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('typing-stop', (data) => {
      console.log(`User ${data.userId} stopped typing in station ${data.stationId}`);
      
      // Broadcast stop typing to others in station (excluding sender)
      socket.to(`station:${data.stationId}`).emit('user-typing', {
        userId: data.userId,
        isTyping: false,
        timestamp: new Date().toISOString()
      });
    });
    
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Server ready on http://${hostname}:${port}`);
    console.log('> Socket.IO initialized and ready for connections');
  });

  // Graceful shutdown handling
  const gracefulShutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    
    // Set a timeout to force exit if graceful shutdown takes too long
    const forceExitTimeout = setTimeout(() => {
      console.log('⚠️ Force exiting after timeout');
      process.exit(1);
    }, 10000); // 10 seconds timeout
    
    server.close(() => {
      console.log('✅ HTTP server closed');
      clearTimeout(forceExitTimeout);
      process.exit(0);
    });
    
    // Also handle case where server.close doesn't work
    setTimeout(() => {
      console.log('⚠️ Server close timeout, force exiting...');
      clearTimeout(forceExitTimeout);
      process.exit(0);
    }, 5000); // 5 seconds for server close
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGUSR1', gracefulShutdown);
  process.on('SIGUSR2', gracefulShutdown);
});