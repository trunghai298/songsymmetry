import { Server as NetServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { NextApiRequest } from 'next';
import { NextApiResponse } from 'next';

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

// Global variable to hold the socket.io server instance
let cachedIO: SocketIOServer | null = null;

export const initSocketServer = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (!cachedIO && res.socket?.server) {
    console.log('Initializing Socket.io server...');
    
    // Create a new Socket.io server instance
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket/io',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });
    
    // Store the Socket.io server instance
    cachedIO = io;
    
    // Also store on the response object for compatibility
    if (res.socket.server) {
      res.socket.server.io = io;
    }
    
    // Set up event handlers for Socket.io connections
    io.on('connection', (socket: Socket) => {
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
        io.to(`station:${data.stationId}`).emit('track-added', {
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
  }
  
  // Return the cached instance if it exists, otherwise from response
  return cachedIO || (res.socket?.server?.io) || null;
};