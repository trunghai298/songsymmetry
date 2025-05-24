"use client";

import React, { useEffect, useState, useCallback } from "react";
import Container from "../components/core/Container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Crown, Globe, Shuffle } from "lucide-react";

interface Station {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  playlistId: string | null;
  isSystem?: boolean;
  stationType?: string;
  owner: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  _count: {
    members: number;
    tracks: number;
  };
  tracks: any[];
}

export default function StationPage() {
  const { data: session } = useSession();
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializingSystem, setIsInitializingSystem] = useState(false);
  const { toast } = useToast();

  const fetchStations = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  const initializeSystemStations = async () => {
    setIsInitializingSystem(true);
    try {
      const response = await fetch("/api/stations/system/init", {
        method: "POST",
      });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "System Stations Initialized",
          description: `Successfully created ${data.summary.successful} system stations`,
        });
        fetchStations();
      } else {
        throw new Error(data.error || "Failed to initialize system stations");
      }
    } catch (error) {
      console.error("Error initializing system stations:", error);
      toast({
        title: "Error",
        description: "Failed to initialize system stations",
        variant: "destructive",
      });
    } finally {
      setIsInitializingSystem(false);
    }
  };

  const systemStations = stations.filter(station => station.isSystem);
  const userStations = stations.filter(station => !station.isSystem);

  return (
    <Container>
      <div className="flex flex-col justify-center items-center">
        <div className="w-full flex flex-row justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-white">Music Stations</h1>

          <div className="flex gap-3">
            {systemStations.length === 0 && (
              <Button 
                onClick={initializeSystemStations}
                disabled={isInitializingSystem}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white font-medium py-2 px-6 rounded-md hover:opacity-90 transition-opacity"
              >
                {isInitializingSystem ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                    Initializing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Setup System Stations
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="w-full flex justify-center items-center h-64">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500"></div>
              <p className="text-white">Loading stations...</p>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-8">
            {/* System Stations Section */}
            {systemStations.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="w-6 h-6 text-green-500" />
                  <h2 className="text-2xl font-bold text-white">Featured Stations</h2>
                  <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-none px-3 py-1">
                    Curated by SongSymmetry
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {systemStations.map((station) => (
                    <Link key={station.id} href={`/station/${station.id}`}>
                      <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-gray-900 to-gray-800 border border-green-500/30 overflow-hidden group">
                        <div className="flex flex-col gap-1">
                          <div className="h-32 bg-gradient-to-br from-green-500 to-blue-500 relative">
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"></div>
                            <div className="absolute top-2 left-2">
                              <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-none px-2 py-1 text-xs font-semibold">
                                <Sparkles className="w-3 h-3 mr-1" />
                                SYSTEM
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 p-3">
                            <h3 className="text-lg font-bold text-white group-hover:text-green-500 transition-colors leading-tight">
                              {station.name}
                            </h3>
                            {station.description && (
                              <p className="text-gray-300 text-xs line-clamp-2">
                                {station.description}
                              </p>
                            )}
                            <div className="flex items-center text-xs text-gray-400 gap-1 mt-1">
                              <i className="bi bi-music-note-list text-green-500"></i>
                              <span>{station._count.tracks} tracks</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* User Stations Section */}
            {userStations.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Community Stations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userStations.map((station) => (
                    <Link key={station.id} href={`/station/${station.id}`}>
                      <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gray-900 border border-gray-800 overflow-hidden group p-4">
                        <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                          {station.name}
                        </h3>
                        <p className="text-gray-300 text-sm mt-2">{station.description}</p>
                        <div className="flex items-center text-xs text-gray-400 gap-4 mt-4">
                          <span><i className="bi bi-people-fill mr-1"></i>{station._count.members}</span>
                          <span><i className="bi bi-music-note-list mr-1"></i>{station._count.tracks}</span>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {stations.length === 0 && (
              <div className="w-full flex flex-col justify-center items-center h-64 border border-dashed border-gray-700 rounded-lg p-8">
                <div className="text-center space-y-4">
                  <i className="bi bi-music-note-beamed text-purple-400 text-5xl"></i>
                  <p className="text-white text-lg">No stations found</p>
                  <p className="text-gray-400 text-sm">
                    Initialize system stations to get started with curated music experiences.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Container>
  );
}