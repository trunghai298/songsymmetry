import { NextApiResponse } from "next";
import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";

export interface NextApiResponseServerIO extends NextApiResponse {
  socket: any & {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
}
