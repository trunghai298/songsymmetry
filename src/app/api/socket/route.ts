import { NextRequest, NextResponse } from 'next/server';
import { NextApiResponseServerIO } from '@/lib/socket/types';
import { Server } from 'socket.io';

// Define a global instance 
let socketIOInstance: Server | null = null;

export async function GET(req: NextRequest, res: NextApiResponseServerIO) {
  try {
    // This ensures that we're in a server-side context and can access res.socket
    if (!res?.socket?.server) {
      throw new Error('Only run this in a server context with socket access');
    }

    // Initialize Socket.io server if not already initialized
    if (!socketIOInstance && !res.socket.server.io) {
      console.log('Initializing Socket.io server...');
      
      const io = new Server(res.socket.server, {
        path: '/api/socket/io',
        addTrailingSlash: false,
        cors: {
          origin: '*',
          methods: ['GET', 'POST'],
        },
      });
      
      // Store the Socket.io server instance
      res.socket.server.io = io;
      socketIOInstance = io;
      
      // Set up event handlers for Socket.io connections
      io.on('connection', (socket) => {
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
        
        // Listen for playback state changes
        socket.on('playback-update', (data: { stationId: string, userId: string, state: any }) => {
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
    
    return NextResponse.json({ 
      success: true,
      message: 'Socket.io server is running',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error initializing Socket.io server:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to initialize Socket.io server' },
      { status: 500 }
    );
  }
}