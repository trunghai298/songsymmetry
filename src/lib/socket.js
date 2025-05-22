import { Server } from 'socket.io';

// Global instance to persist the socket.io server
let socketIOInstance = null;

export function initSocketIO(server) {
  if (socketIOInstance) {
    return socketIOInstance;
  }

  try {
    console.log('Initializing Socket.IO server...');
    
    const io = new Server(server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    io.on('connection', socket => {
      console.log(`Socket connected: ${socket.id}`);
      
      // Listen for a user joining a station
      socket.on('join-station', (stationId, userId) => {
        console.log(`User ${userId} joined station ${stationId}`);
        socket.join(`station:${stationId}`);
        
        // Notify others that a new user joined
        socket.to(`station:${stationId}`).emit('user-joined', { 
          userId,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
      });
      
      // Listen for a user leaving a station
      socket.on('leave-station', (stationId, userId) => {
        console.log(`User ${userId} left station ${stationId}`);
        socket.leave(`station:${stationId}`);
        
        // Notify others that a user left
        socket.to(`station:${stationId}`).emit('user-left', { 
          userId,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
      });
      
      // Listen for a user adding a track to the station
      socket.on('add-track', (data) => {
        console.log(`User ${data.userId} added track to station ${data.stationId}`);
        
        // Broadcast the new track to all users in this station
        io.to(`station:${data.stationId}`).emit('track-added', {
          userId: data.userId,
          track: data.track,
          timestamp: new Date().toISOString()
        });
      });
      
      // Listen for playback state changes
      socket.on('playback-update', (data) => {
        // Broadcast the playback state to all users in this station
        socket.to(`station:${data.stationId}`).emit('playback-updated', {
          userId: data.userId,
          state: data.state,
          timestamp: new Date().toISOString()
        });
      });
      
      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });

    socketIOInstance = io;
    console.log('Socket.IO server initialized successfully');
    
    return io;
  } catch (error) {
    console.error('Error initializing Socket.IO:', error);
    throw error;
  }
}