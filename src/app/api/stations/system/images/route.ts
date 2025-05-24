import { NextRequest, NextResponse } from "next/server";
import { updateAllSystemStationImages, updateStationImageFromSpotify } from "@/lib/stations/stationImageService";

// POST: Update system station images from Spotify
export async function POST(request: NextRequest) {
  try {
    const { stationId } = await request.json();

    if (stationId) {
      // Update specific station image
      const success = await updateStationImageFromSpotify(stationId);
      
      if (success) {
        return NextResponse.json({
          message: `Station image updated successfully`,
          stationId,
        });
      } else {
        return NextResponse.json(
          { error: "Failed to update station image" },
          { status: 400 }
        );
      }
    } else {
      // Update all system station images
      await updateAllSystemStationImages();
      
      return NextResponse.json({
        message: "All system station images updated successfully",
      });
    }
  } catch (error) {
    console.error("Error updating station images:", error);
    return NextResponse.json(
      { error: "Failed to update station images" },
      { status: 500 }
    );
  }
}