import { NextRequest, NextResponse } from "next/server";
import {
  initSocketServer,
  NextApiResponseWithSocket,
} from "@/lib/socket/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
  res: NextApiResponseWithSocket
) {
  try {
    const stationId = params.id;

    // Initialize Socket.io server if it doesn't exist
    const io = initSocketServer(req as any, res);

    // Get current active users in this station
    const room = io?.sockets.adapter.rooms.get(`station:${stationId}`);
    const connectedClients = room ? Array.from(room) : [];

    // Return current station state
    return NextResponse.json({
      stationId,
      activeConnections: connectedClients.length,
      socketIds: connectedClients,
    });
  } catch (error) {
    console.error(`Error with socket for station ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to get station socket information" },
      { status: 500 }
    );
  }
}
