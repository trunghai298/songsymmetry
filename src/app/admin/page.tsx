"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Container from "../components/core/Container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Settings, Play, Calendar, Music, Users, Activity } from "lucide-react";

interface DailyGame {
  id: string;
  date: string;
  songName: string;
  artistName: string;
  albumName?: string;
  genre?: string;
  releaseYear?: number;
  popularity?: number;
  imageUrl?: string;
  _count: {
    attempts: number;
  };
}

// Admin user ID - only this user can access the admin panel
const ADMIN_USER_ID = '31scr23lvn5o3erf52cyo7vmlgai';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [todayGame, setTodayGame] = useState<DailyGame | null>(null);
  const [recentGames, setRecentGames] = useState<DailyGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdminUser = session?.user && (session.user as any).id === ADMIN_USER_ID;

  useEffect(() => {
    if (status === "authenticated" && isAdminUser) {
      fetchRecentGames();
    }
  }, [status, isAdminUser]);

  const fetchRecentGames = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/daily-song-game/admin?limit=5");
      if (response.ok) {
        const data = await response.json();
        setRecentGames(data.games);
        
        // Check if today's game exists
        const today = new Date().toISOString().split('T')[0];
        const todaysGame = data.games.find((game: DailyGame) => 
          game.date.split('T')[0] === today
        );
        setTodayGame(todaysGame || null);
      }
    } catch (error) {
      console.error("Error fetching games:", error);
      toast({
        title: "Error",
        description: "Failed to fetch recent games",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateTodayGame = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/daily-song-game/admin", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Daily game generated successfully",
        });
        
        // Refresh the games list
        await fetchRecentGames();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to generate daily game",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating game:", error);
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 sm:pt-24">
        <Container>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-white">Loading...</div>
          </div>
        </Container>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 sm:pt-24">
        <Container>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
              <p className="text-gray-400">Please sign in to access the admin panel</p>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (status === "authenticated" && !isAdminUser) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 sm:pt-24">
        <Container>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
              <p className="text-gray-400">You don't have permission to access the admin panel</p>
              <div className="mt-6">
                <Button
                  onClick={() => window.history.back()}
                  className="bg-gray-700 hover:bg-gray-600 text-white"
                >
                  Go Back
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 pt-20 sm:pt-24">
      <Container>
        <div className="py-4 sm:py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-8 h-8 text-purple-400" />
              <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            </div>
            <p className="text-gray-300">Manage daily song games and system settings</p>
          </div>

          {/* Today's Game Status */}
          <Card className="bg-gray-800 border-gray-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Today's Game Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-gray-400">Loading...</div>
              ) : todayGame ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-green-600/20 border border-green-500/30 rounded-lg">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                      <Music className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">Game is Live!</h3>
                      <p className="text-gray-300">
                        {todayGame.songName} by {todayGame.artistName}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {todayGame._count.attempts} attempts
                        </span>
                        {todayGame.releaseYear && (
                          <span>{todayGame.releaseYear}</span>
                        )}
                        {todayGame.genre && (
                          <span>{todayGame.genre}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-yellow-600/20 border border-yellow-500/30 rounded-lg">
                    <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">No Game Today</h3>
                      <p className="text-gray-300">Generate today's daily song game</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={generateTodayGame}
                    disabled={isGenerating}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    {isGenerating ? "Generating..." : "Generate Today's Game"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Games */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Music className="w-5 h-5 text-purple-400" />
                Recent Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-gray-400">Loading recent games...</div>
              ) : recentGames.length > 0 ? (
                <div className="space-y-3">
                  {recentGames.map((game) => (
                    <div
                      key={game.id}
                      className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      {game.imageUrl && (
                        <img
                          src={game.imageUrl}
                          alt={game.songName}
                          className="w-12 h-12 rounded-md object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{game.songName}</h3>
                        <p className="text-gray-300 text-sm">{game.artistName}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                          <span>{formatDate(game.date)}</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {game._count.attempts} attempts
                          </span>
                          {game.releaseYear && <span>{game.releaseYear}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">
                  No games found. Generate the first game!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  );
}