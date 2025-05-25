"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Container from "../components/core/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

interface GameAttempt {
  id: string;
  guessedSongName: string;
  guessedArtistName: string;
  guessedAlbumName?: string;
  guessedGenre?: string;
  guessedReleaseYear?: number;
  guessedPopularity?: number;
  guessedDurationMs?: number;
  guessedImageUrl?: string;
  guessedIsExplicit?: boolean;
  attemptNumber: number;
  isCorrect: boolean;
}

interface GameState {
  gameId: string;
  date: string;
  attempts: GameAttempt[];
  hasWon: boolean;
  attemptCount: number;
  canPlayMore: boolean;
  answer?: {
    songName: string;
    artistName: string;
    albumName?: string;
    genre?: string;
    releaseYear?: number;
    popularity?: number;
    durationMs?: number;
    imageUrl?: string;
    isExplicit?: boolean;
  };
}

interface ComparisonResult {
  songName: "correct" | "incorrect";
  artistName: "correct" | "incorrect";
  albumName: "correct" | "incorrect";
  genre: "correct" | "incorrect";
  releaseYear: "correct" | "close" | "incorrect";
  popularity: "correct" | "close" | "incorrect";
  durationMs: "correct" | "close" | "incorrect";
  isExplicit: "correct" | "incorrect";
}

export default function DailySongGamePage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);

  useEffect(() => {
    if (session) {
      loadGameState();
    }
  }, [session]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.trim().length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      try {
        const response = await fetch(`/api/spotify/search-suggestions?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.tracks || []);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.trim().length >= 2) {
      setIsSearching(true);
      debouncedSearch(value);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const loadGameState = async () => {
    try {
      const response = await fetch("/api/daily-song-game");
      if (response.ok) {
        const data = await response.json();
        setGameState(data);
        
        // Load comparison results for existing attempts
        const comps: ComparisonResult[] = [];
        for (const attempt of data.attempts) {
          // Calculate comparison for each attempt
          // This would typically come from the server
          comps.push({
            songName: attempt.isCorrect ? "correct" : "incorrect",
            artistName: "incorrect", // Placeholder
            albumName: "incorrect",
            genre: "incorrect",
            releaseYear: "incorrect",
            popularity: "incorrect",
            durationMs: "incorrect",
            isExplicit: "incorrect"
          });
        }
        setComparisons(comps);
      } else if (response.status === 404) {
        toast({
          title: "No game available",
          description: "Today's song hasn't been set up yet. Check back later!",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error loading game state:", error);
      toast({
        title: "Error",
        description: "Failed to load today's game",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handleGuess = async (track: any) => {
    if (!gameState || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/daily-song-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guessedSongId: track.id })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update game state
        setGameState(prev => prev ? {
          ...prev,
          attempts: [...prev.attempts, data.attempt],
          hasWon: data.isCorrect,
          attemptCount: prev.attemptCount + 1,
          canPlayMore: !data.gameOver,
          answer: data.answer
        } : null);

        // Add comparison result
        setComparisons(prev => [...prev, data.comparison]);

        // Clear search
        setSearchQuery("");
        setSearchResults([]);

        if (data.isCorrect) {
          toast({
            title: "Congratulations! 🎉",
            description: `You guessed it in ${data.attempt.attemptNumber} attempt${data.attempt.attemptNumber > 1 ? 's' : ''}!`,
            variant: "default"
          });
        }
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to submit guess",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error submitting guess:", error);
      toast({
        title: "Error",
        description: "Failed to submit guess",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getResultColor = (result: "correct" | "close" | "incorrect") => {
    switch (result) {
      case "correct": return "bg-green-500";
      case "close": return "bg-yellow-500";
      case "incorrect": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "Unknown";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <Container>
        <div className="flex justify-center items-center h-64">
          <div className="text-white text-xl">Loading today's game...</div>
        </div>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container>
        <div className="text-center py-16">
          <h1 className="text-4xl font-bold text-white mb-4">Daily Song Game</h1>
          <p className="text-gray-400 mb-8">Sign in to play today's song guessing game!</p>
        </div>
      </Container>
    );
  }

  if (!gameState) {
    return (
      <Container>
        <div className="text-center py-16">
          <h1 className="text-4xl font-bold text-white mb-4">Daily Song Game</h1>
          <p className="text-gray-400">No game available for today. Check back later!</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Guess today's song!
          </h1>
          <p className="text-gray-400">
            {gameState.hasWon 
              ? `You won in ${gameState.attemptCount} attempt${gameState.attemptCount > 1 ? 's' : ''}! 🎉`
              : `${gameState.attemptCount} attempt${gameState.attemptCount !== 1 ? 's' : ''} made`
            }
          </p>
        </div>

        {/* Search for songs */}
        {gameState.canPlayMore && (
          <Card className="p-6 mb-6 bg-gray-800/50 border-gray-700">
            <div className="mb-4">
              <Input
                placeholder="Type to search for a song... (minimum 2 characters)"
                value={searchQuery}
                onChange={handleSearchChange}
                className="bg-gray-700 border-gray-600 text-white"
              />
              {isSearching && (
                <div className="mt-2 text-sm text-gray-400 flex items-center">
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Searching...
                </div>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => handleGuess(track)}
                  >
                    <div className="flex items-center gap-3">
                      {track.image && (
                        <img 
                          src={track.image} 
                          alt={track.name}
                          className="w-10 h-10 rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{track.name}</p>
                        <p className="text-sm text-gray-400 truncate">
                          {track.artist}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{track.album}</span>
                          <span>•</span>
                          <span>{track.year}</span>
                          {track.explicit && (
                            <>
                              <span>•</span>
                              <span className="text-red-400">E</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      disabled={isSubmitting}
                      className="text-purple-400 hover:text-white hover:bg-purple-600 flex-shrink-0"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        "Guess"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Game Grid - Headers */}
        <div className="mb-4">
          <div className="grid grid-cols-9 gap-2 mb-2">
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">Song</div>
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">Artist</div>
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">Album</div>
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">Genre</div>
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">Year</div>
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">Popularity</div>
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">Duration</div>
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">Explicit</div>
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">Cover</div>
          </div>

          {/* Attempts */}
          {gameState.attempts.map((attempt, index) => {
            const comparison = comparisons[index];
            return (
              <div key={attempt.id} className="grid grid-cols-9 gap-2 mb-2">
                <div className={`p-3 rounded text-center text-white font-medium ${getResultColor(comparison?.songName || "incorrect")}`}>
                  {attempt.guessedSongName}
                </div>
                <div className={`p-3 rounded text-center text-white font-medium ${getResultColor(comparison?.artistName || "incorrect")}`}>
                  {attempt.guessedArtistName}
                </div>
                <div className={`p-3 rounded text-center text-white font-medium ${getResultColor(comparison?.albumName || "incorrect")}`}>
                  {attempt.guessedAlbumName || "Unknown"}
                </div>
                <div className={`p-3 rounded text-center text-white font-medium ${getResultColor(comparison?.genre || "incorrect")}`}>
                  {attempt.guessedGenre || "Unknown"}
                </div>
                <div className={`p-3 rounded text-center text-white font-medium ${getResultColor(comparison?.releaseYear || "incorrect")}`}>
                  {attempt.guessedReleaseYear || "Unknown"}
                </div>
                <div className={`p-3 rounded text-center text-white font-medium ${getResultColor(comparison?.popularity || "incorrect")}`}>
                  {attempt.guessedPopularity || "Unknown"}
                </div>
                <div className={`p-3 rounded text-center text-white font-medium ${getResultColor(comparison?.durationMs || "incorrect")}`}>
                  {formatDuration(attempt.guessedDurationMs)}
                </div>
                <div className={`p-3 rounded text-center text-white font-medium ${getResultColor(comparison?.isExplicit || "incorrect")}`}>
                  {attempt.guessedIsExplicit === true ? "Yes" : attempt.guessedIsExplicit === false ? "No" : "Unknown"}
                </div>
                <div className="p-1 rounded bg-gray-700 flex items-center justify-center">
                  {attempt.guessedImageUrl && (
                    <img 
                      src={attempt.guessedImageUrl} 
                      alt="Album cover"
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Answer reveal */}
        {gameState.answer && (
          <Card className="p-6 bg-gradient-to-r from-green-800/20 to-blue-800/20 border-green-500/30">
            <h3 className="text-xl font-bold text-white mb-4">
              {gameState.hasWon ? "Correct Answer! 🎉" : "The Answer Was:"}
            </h3>
            <div className="grid grid-cols-9 gap-2">
              <div className="p-3 bg-green-500 rounded text-center text-white font-medium">
                {gameState.answer.songName}
              </div>
              <div className="p-3 bg-green-500 rounded text-center text-white font-medium">
                {gameState.answer.artistName}
              </div>
              <div className="p-3 bg-green-500 rounded text-center text-white font-medium">
                {gameState.answer.albumName || "Unknown"}
              </div>
              <div className="p-3 bg-green-500 rounded text-center text-white font-medium">
                {gameState.answer.genre || "Unknown"}
              </div>
              <div className="p-3 bg-green-500 rounded text-center text-white font-medium">
                {gameState.answer.releaseYear || "Unknown"}
              </div>
              <div className="p-3 bg-green-500 rounded text-center text-white font-medium">
                {gameState.answer.popularity || "Unknown"}
              </div>
              <div className="p-3 bg-green-500 rounded text-center text-white font-medium">
                {formatDuration(gameState.answer.durationMs)}
              </div>
              <div className="p-3 bg-green-500 rounded text-center text-white font-medium">
                {gameState.answer.isExplicit === true ? "Yes" : gameState.answer.isExplicit === false ? "No" : "Unknown"}
              </div>
              <div className="p-1 bg-green-500 rounded flex items-center justify-center">
                {gameState.answer.imageUrl && (
                  <img 
                    src={gameState.answer.imageUrl} 
                    alt="Album cover"
                    className="w-10 h-10 rounded object-cover"
                  />
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Game over message */}
        {!gameState.canPlayMore && (
          <div className="text-center mt-8">
            <p className="text-gray-400 mb-4">
              Come back tomorrow for a new song to guess!
            </p>
            <Button 
              onClick={() => window.location.href = '/daily-song-game/stats'}
              variant="outline"
              className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
            >
              View Your Stats
            </Button>
          </div>
        )}
      </div>
    </Container>
  );
}