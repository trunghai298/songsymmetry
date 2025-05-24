import { NextRequest, NextResponse } from "next/server";
import { initializeSystemStations } from "@/lib/stations/systemStations";

// POST: Force initialize all system stations (admin endpoint)
export async function POST() {
  try {
    console.log("Initializing system stations...");
    const results = await initializeSystemStations();
    
    const summary = {
      total: results.length,
      successful: results.filter(r => r.station && !r.error).length,
      failed: results.filter(r => r.error).length,
      details: results,
    };

    console.log("System stations initialization completed:", summary);

    return NextResponse.json({
      message: "System stations initialization completed",
      summary,
    });
  } catch (error) {
    console.error("Error initializing system stations:", error);
    return NextResponse.json(
      { error: "Failed to initialize system stations" },
      { status: 500 }
    );
  }
}