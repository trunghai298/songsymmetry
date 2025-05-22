import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';

// Global variable to hold the Socket.io server instance
let socketIOInstance: SocketIOServer | null = null;

export function getSocketIOInstance() {
  return socketIOInstance;
}

export function initSocketIO(server: NetServer) {
  if (socketIOInstance) return socketIOInstance;
  
  console.log('Initializing Socket.IO server...');
  
  // Create a new Socket.io server instance
  socketIOInstance = new SocketIOServer(server, {
    path: '/api/socket/io',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });
  
  // Set up event handlers for Socket.io connections
  socketIOInstance.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    // Listen for a user joining a station
    socket.on('join-station', (stationId: string, userId: string) => {
      console.log(`User ${userId} joined station ${stationId}`);
      // Add the socket to a room for this station
      socket.join(`station:${stationId}`);
      
      // Notify others that a new user joined
      socket.to(`station:${stationId}`).emit('user-joined', { 
        userId,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
    });
    
    // Listen for a user leaving a station
    socket.on('leave-station', (stationId: string, userId: string) => {
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
    socket.on('add-track', (data: { stationId: string, userId: string, track: any }) => {
      console.log(`User ${data.userId} added track to station ${data.stationId}`);
      
      // Broadcast the new track to all users in this station
      socketIOInstance?.to(`station:${data.stationId}`).emit('track-added', {
        userId: data.userId,
        track: data.track,
        timestamp: new Date().toISOString()
      });
    });
    
    // Listen for playback state changes from the station owner/DJ
    socket.on('playback-update', (data: { stationId: string, userId: string, state: any }) => {
      // Broadcast the playback state to all users in this station
      socket.to(`station:${data.stationId}`).emit('playback-updated', {
        userId: data.userId,
        state: data.state,
        timestamp: new Date().toISOString()
      });
    });
    
    // Handle disconnections
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
  
  return socketIOInstance;
}