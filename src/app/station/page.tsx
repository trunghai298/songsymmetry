'use client';

import React, { useEffect, useState } from "react";
import Container from "../components/core/Container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface Station {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  playlistId: string | null;
  owner: {
    id: string;
    name: string | null;
    image: string | null;
  };
  _count: {
    members: number;
    tracks: number;
  };
  tracks: Track[];
}

interface Track {
  id: string;
  name: string | null;
  artist: string | null;
  trackId: string;
  addedAt: string;
  addedBy: {
    id: string;
    name: string | null;
  };
}

export default function StationPage() {
  const { data: session } = useSession();
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newStation, setNewStation] = useState({
    name: "",
    description: "",
    imageUrl: "",
    playlistId: "",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch stations on component mount
  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/stations");
      const data = await response.json();
      setStations(data);
    } catch (error) {
      console.error("Error fetching stations:", error);
      toast({
        title: "Error",
        description: "Failed to load stations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to create a station",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await fetch("/api/stations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newStation),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create station");
      }
      
      let stationData;
      try {
        stationData = await response.json();
      } catch (e) {
        console.error("Error parsing response:", e);
        stationData = {}; // Fallback if response is not JSON
      }
      
      // Reset form and close dialog
      setNewStation({
        name: "",
        description: "",
        imageUrl: "",
        playlistId: "",
      });
      setDialogOpen(false);
      
      // Refresh stations list
      fetchStations();
      
      // Show different toast messages based on whether tracks were imported
      if (stationData.importResults?.imported) {
        toast({
          title: "Station created with tracks",
          description: `Your station is ready with ${stationData.importResults.success} tracks imported from the playlist${stationData.importResults.failed > 0 ? ` (${stationData.importResults.failed} failed)` : ''}!`,
          variant: "default",
        });
      } else if (stationData.playlistId && (!stationData.importResults || stationData.importResults.success === 0)) {
        toast({
          title: "Station created",
          description: "Your station is ready, but we couldn't import tracks from the playlist. You can try importing them later.",
          variant: "default",
        });
      } else {
        toast({
          title: "Station created",
          description: "Your new station is ready!",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error creating station:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create station",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewStation(prev => ({ ...prev, [name]: value }));
  };
  
  // Function to get a default image if none is provided
  const getStationImage = (station: Station) => {
    if (station.imageUrl) return station.imageUrl;
    
    // Fallback images based on station name
    const fallbackImages = [
      "https://i.scdn.co/image/ab67616d0000b273580ac3ad7dfc81e509171120",
      "https://i.scdn.co/image/ab67616d0000b2732d602ab2d4acff0c2cf57683",
      "https://i.scdn.co/image/ab67616d0000b273294bd60dc714e50553eceb73",
      "https://i.scdn.co/image/ab67616d0000b2737bf1e8d5308b5286c7b2fe5c",
    ];
    
    // Use a deterministic way to choose an image based on station ID
    const index = station.id.charCodeAt(0) % fallbackImages.length;
    return fallbackImages[index];
  };

  return (
    <Container>
      <div className="flex flex-col justify-center items-center">
        <div className="w-full flex flex-row justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-white">Music Stations</h1>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="button-85 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-medium py-2 px-6 rounded-md hover:opacity-90 transition-opacity">
                <i className="bi bi-broadcast-pin mr-2"></i>
                Create Station
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border border-gray-800 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white">Create a new station</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleCreateStation} className="space-y-5 mt-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-300 text-sm font-medium">Station Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={newStation.name}
                    onChange={handleInputChange}
                    placeholder="My Awesome Station"
                    required
                    className="bg-gray-800 border-gray-700 text-white focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-300 text-sm font-medium">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    value={newStation.description}
                    onChange={handleInputChange}
                    placeholder="Join us for some great music!"
                    className="bg-gray-800 border-gray-700 text-white focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="imageUrl" className="text-gray-300 text-sm font-medium">Cover Image URL</Label>
                  <Input
                    id="imageUrl"
                    name="imageUrl"
                    value={newStation.imageUrl}
                    onChange={handleInputChange}
                    placeholder="https://example.com/image.jpg"
                    className="bg-gray-800 border-gray-700 text-white focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="playlistId" className="text-gray-300 text-sm font-medium">
                    Spotify Playlist ID (optional)
                  </Label>
                  <Input
                    id="playlistId"
                    name="playlistId"
                    value={newStation.playlistId}
                    onChange={handleInputChange}
                    placeholder="37i9dQZF1DXcBWIGoYBM5M"
                    className="bg-gray-800 border-gray-700 text-white focus:ring-purple-500 focus:border-purple-500"
                  />
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>You can find this in the Spotify playlist URL after "playlist/"</p>
                    <p>Adding a playlist ID lets you later import all tracks from that playlist to your station.</p>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full button-85 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium py-2 rounded-md hover:opacity-90 transition-opacity"
                >
                  <i className="bi bi-music-note-list mr-2"></i>
                  Create Station
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        {isLoading ? (
          <div className="w-full flex justify-center items-center h-64">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500 border-r-2 border-purple-500 border-b-2 border-transparent"></div>
              <p className="text-white">Loading stations...</p>
            </div>
          </div>
        ) : stations.length === 0 ? (
          <div className="w-full flex flex-col justify-center items-center h-64 border border-dashed border-gray-700 rounded-lg p-8">
            <div className="text-center space-y-4">
              <i className="bi bi-music-note-beamed text-purple-400 text-5xl"></i>
              <p className="text-white text-lg">No stations found</p>
              <p className="text-gray-400 text-sm">Create your first station to start collaborating and listening with others.</p>
            </div>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="mt-6 button-85 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-medium py-2 px-6 rounded-md hover:opacity-90 transition-opacity"
            >
              <i className="bi bi-plus-circle mr-2"></i>
              Create Your First Station
            </Button>
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {stations.map((station) => (
              <Link key={station.id} href={`/station/${station.id}`}>
                <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gray-900 border border-gray-800 overflow-hidden group">
                  <div className="flex flex-col gap-1">
                    <div
                      style={{
                        backgroundImage: `url('${getStationImage(station)}')`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                        backgroundSize: "cover",
                        height: "180px",
                      }}
                      className="relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-70"></div>
                      
                      {/* Live badge */}
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-red-600 text-white border-none px-2 py-1 text-xs font-semibold">
                          <span className="mr-1 inline-block w-2 h-2 bg-white rounded-full animate-pulse"></span>
                          LIVE
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3 p-4">
                      <div className="space-y-1">
                        <h2 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                          {station.name}
                        </h2>
                        {station.description && (
                          <p className="text-gray-300 text-sm line-clamp-2">
                            {station.description}
                          </p>
                        )}
                      </div>
                      
                      {station.tracks[0] && (
                        <div className="flex flex-row items-center justify-start gap-1 bg-gray-800 p-2 rounded-md mt-1">
                          <div className="flex-shrink-0 w-8 h-8 bg-gray-700 rounded-sm flex items-center justify-center">
                            <i className="bi bi-music-note text-purple-400"></i>
                          </div>
                          <div className="overflow-hidden">
                            <h3 className="text-white text-xs font-medium">Now Playing:</h3>
                            <p className="text-sm font-medium truncate text-purple-400">
                              {station.tracks[0].name} - {station.tracks[0].artist}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-row items-center justify-between">
                        <Badge
                          variant="outline"
                          className="bg-gray-800 border-gray-700 text-gray-200"
                        >
                          <div className="flex items-center gap-1.5">
                            <i className="bi bi-broadcast-pin text-purple-400"></i>
                            <span className="text-xs">Hosted by </span>
                            <span className="font-medium text-purple-300">{station.owner.name}</span>
                          </div>
                        </Badge>
                        
                        <div className="flex items-center text-xs text-gray-400 gap-1">
                          <i className="bi bi-people-fill text-gray-500"></i>
                          <span>{station._count.members}</span>
                          <span className="mx-1">·</span>
                          <i className="bi bi-music-note-list text-gray-500"></i>
                          <span>{station._count.tracks}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}