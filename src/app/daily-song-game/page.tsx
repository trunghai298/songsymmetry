"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Container from "../components/core/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Confetti from "react-confetti";

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

// Countdown Timer Component
function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diff = tomorrow.getTime() - now.getTime();

      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      }

      return "00:00:00";
    };

    const updateTimer = () => {
      setTimeLeft(calculateTimeLeft());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  return <span>{timeLeft}</span>;
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
  // Game progression info
  gameNumber?: number;
  totalGames?: number;
  completedGames?: number;
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
  const [animatingRowIndex, setAnimatingRowIndex] = useState<number | null>(
    null
  );
  const [revealedColumns, setRevealedColumns] = useState<number>(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [completionCount, setCompletionCount] = useState<number | null>(null);
  
  // Hints system state
  const [hintsAvailable, setHintsAvailable] = useState(false);
  const [hintsUsed, setHintsUsed] = useState<string[]>([]);
  const [revealedHints, setRevealedHints] = useState<{[key: string]: any}>({});
  const [isGettingHint, setIsGettingHint] = useState(false);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.trim().length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/spotify/search-suggestions?q=${encodeURIComponent(query)}`
        );
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
    }, 500), // Increased debounce delay to 500ms
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

  const loadGameState = useCallback(async () => {
    try {
      const response = await fetch("/api/daily-song-game");
      if (response.ok) {
        const data = await response.json();
        // Reverse attempts to show newest first
        const reversedData = {
          ...data,
          attempts: data.attempts.slice().reverse(),
        };
        setGameState(reversedData);
        
        // Set hints availability
        setHintsAvailable(data.hintsAvailable || false);
        
        // Initialize hints used for the current attempt
        if (data.attempts.length > 0) {
          const latestAttempt = data.attempts[data.attempts.length - 1];
          const usedHints = latestAttempt.hintsUsed || [];
          setHintsUsed(usedHints);
          
          // Restore revealed hints if any were used
          if (usedHints.length > 0) {
            restoreRevealedHints(usedHints, data);
          }
        }

        // Load comparison results for existing attempts (reverse to show newest first)
        const comps: ComparisonResult[] = [];
        for (const attempt of data.attempts.slice().reverse()) {
          // Calculate comparison for each attempt
          if (data.answer) {
            comps.push({
              songName: attempt.isCorrect ? "correct" : "incorrect",
              artistName:
                attempt.guessedArtistName === data.answer.artistName
                  ? "correct"
                  : "incorrect",
              albumName:
                attempt.guessedAlbumName === data.answer.albumName
                  ? "correct"
                  : "incorrect",
              genre:
                attempt.guessedGenre === data.answer.genre
                  ? "correct"
                  : "incorrect",
              releaseYear:
                attempt.guessedReleaseYear === data.answer.releaseYear
                  ? "correct"
                  : Math.abs(
                      (attempt.guessedReleaseYear || 0) -
                        (data.answer.releaseYear || 0)
                    ) <= 2
                  ? "close"
                  : "incorrect",
              popularity:
                attempt.guessedPopularity === data.answer.popularity
                  ? "correct"
                  : Math.abs(
                      (attempt.guessedPopularity || 0) -
                        (data.answer.popularity || 0)
                    ) <= 10
                  ? "close"
                  : "incorrect",
              durationMs:
                attempt.guessedDurationMs === data.answer.durationMs
                  ? "correct"
                  : Math.abs(
                      (attempt.guessedDurationMs || 0) -
                        (data.answer.durationMs || 0)
                    ) <= 30000
                  ? "close"
                  : "incorrect",
              isExplicit:
                attempt.guessedIsExplicit === data.answer.isExplicit
                  ? "correct"
                  : "incorrect",
            });
          } else {
            // If no answer data (user hasn't won yet), show all as unknown/gray
            comps.push({
              songName: attempt.isCorrect ? "correct" : "incorrect",
              artistName: "incorrect",
              albumName: "incorrect",
              genre: "incorrect",
              releaseYear: "incorrect",
              popularity: "incorrect",
              durationMs: "incorrect",
              isExplicit: "incorrect",
            });
          }
        }
        setComparisons(comps);
      } else if (response.status === 404) {
        toast({
          title: "No game available",
          description: "Today's song hasn't been set up yet. Check back later!",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error loading game state:", error);
      toast({
        title: "Error",
        description: "Failed to load today's game",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (session) {
      loadGameState();
    }
  }, [session, loadGameState]);

  // Track window size for confetti
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateWindowSize();
    window.addEventListener("resize", updateWindowSize);
    return () => window.removeEventListener("resize", updateWindowSize);
  }, []);

  // Show confetti if user has already won when loading the page
  useEffect(() => {
    if (gameState?.hasWon && windowSize.width > 0) {
      // Fetch completion count for returning winners
      fetchCompletionCount(gameState.gameId);

      setShowConfetti(true);

      // Stop confetti after 5 seconds for returning users, then show modal
      setTimeout(() => {
        setShowConfetti(false);
        // Show success modal after confetti ends
        setTimeout(() => {
          setShowSuccessModal(true);
        }, 500);
      }, 5000);
    }
  }, [gameState?.hasWon, gameState?.gameId, windowSize.width]);

  const fetchCompletionCount = async (gameId: string) => {
    try {
      const response = await fetch(
        `/api/daily-song-game/stats?gameId=${gameId}`
      );
      if (response.ok) {
        const data = await response.json();
        setCompletionCount(data.stats.winners);
      }
    } catch (error) {
      console.error("Error fetching completion count:", error);
    }
  };

  const handleGuess = async (track: any) => {
    if (!gameState || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/daily-song-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          guessedSongId: track.id,
          hintsUsed: hintsUsed
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update game state (prepend new attempt to show newest first)
        setGameState((prev) =>
          prev
            ? {
                ...prev,
                attempts: [data.attempt, ...prev.attempts],
                hasWon: data.isCorrect,
                attemptCount: prev.attemptCount + 1,
                canPlayMore: !data.gameOver,
                answer: data.answer,
              }
            : null
        );
        
        // Update hints availability and reset hints used for next attempt
        setHintsAvailable(data.hintsAvailable || false);
        setHintsUsed([]);

        // Start animation for the new row (index 0 since we prepend)
        setAnimatingRowIndex(0);
        setRevealedColumns(0);

        // Add comparison result (prepend to show newest first)
        setComparisons((prev) => [data.comparison, ...prev]);

        // Clear search
        setSearchQuery("");
        setSearchResults([]);

        // Trigger column reveal animation
        const animateColumns = () => {
          const totalColumns = 8; // song, artist, album, genre, year, popularity, duration, explicit

          for (let i = 0; i <= totalColumns; i++) {
            setTimeout(() => {
              setRevealedColumns(i);
              if (i === totalColumns) {
                // Animation complete
                setTimeout(() => {
                  setAnimatingRowIndex(null);
                  setRevealedColumns(0);
                }, 200);
              }
            }, i * 200); // 200ms delay between each column
          }
        };

        // Start animation after a brief delay
        setTimeout(animateColumns, 100);

        if (data.isCorrect) {
          // Fetch completion count
          fetchCompletionCount(gameState.gameId);

          // Trigger confetti for longer duration
          setShowConfetti(true);

          // Stop confetti after 8 seconds, then show success modal
          setTimeout(() => {
            setShowConfetti(false);
            // Show success modal after confetti ends
            setTimeout(() => {
              setShowSuccessModal(true);
            }, 500); // Small delay after confetti stops
          }, 8000);

          toast({
            title: "Congratulations! 🎉",
            description: `You guessed it in ${
              data.attempt.attemptNumber
            } attempt${data.attempt.attemptNumber > 1 ? "s" : ""}!`,
            variant: "default",
          });
        }
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to submit guess",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting guess:", error);
      toast({
        title: "Error",
        description: "Failed to submit guess",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const playNextGame = async () => {
    setIsLoading(true);
    setShowSuccessModal(false);
    setShowConfetti(false);
    setComparisons([]);
    setSearchQuery("");
    setSearchResults([]);
    setHintsUsed([]);
    setRevealedHints({});
    setHintsAvailable(false);
    
    try {
      // Reload the game state to get the next unfinished game
      await loadGameState();
    } catch (error) {
      console.error("Error loading next game:", error);
      toast({
        title: "Error",
        description: "Failed to load next game",
        variant: "destructive",
      });
    }
  };

  const getResultColor = (result: "correct" | "close" | "incorrect") => {
    switch (result) {
      case "correct":
        return "bg-green-500";
      case "close":
        return "bg-yellow-500";
      case "incorrect":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getDirectionalArrow = (
    guessedValue: number | null,
    actualValue: number | null,
    result: string
  ) => {
    if (result === "correct" || !guessedValue || !actualValue) return "";
    if (guessedValue < actualValue) return "↑"; // Higher
    if (guessedValue > actualValue) return "↓"; // Lower
    return "";
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "Unknown";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const restoreRevealedHints = (usedHints: string[], gameData: any) => {
    const restoredHints: {[key: string]: any} = {};
    
    // Use the hint data from the main API response
    if (gameData.revealedHintData) {
      usedHints.forEach(hintType => {
        if (gameData.revealedHintData[hintType]) {
          restoredHints[hintType] = gameData.revealedHintData[hintType];
        }
      });
    }
    
    setRevealedHints(restoredHints);
  };

  const getHint = async (hintType: string) => {
    if (!gameState || isGettingHint || hintsUsed.includes(hintType)) return;

    setIsGettingHint(true);
    try {
      const response = await fetch("/api/daily-song-game/hints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          gameId: gameState.gameId,
          hintType: hintType
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRevealedHints(prev => ({
          ...prev,
          [hintType]: data.hint.data
        }));
        setHintsUsed(prev => [...prev, hintType]);
        
        // Ensure hints remain available after using one (unless all 3 are used)
        if (hintsUsed.length + 1 < 3) {
          setHintsAvailable(true);
        }
        
        toast({
          title: "Hint revealed! 💡",
          description: `You've used a ${hintType} hint`,
          variant: "default",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to get hint",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error getting hint:", error);
      toast({
        title: "Error",
        description: "Failed to get hint",
        variant: "destructive",
      });
    } finally {
      setIsGettingHint(false);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <div className="flex justify-center items-center h-64">
          <div className="text-white text-xl">Loading today&apos;s game...</div>
        </div>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container>
        <div className="text-center py-16">
          <h1 className="text-4xl font-bold text-white mb-4">
            Daily Song Game
          </h1>
          <p className="text-gray-400 mb-8">
            Sign in to play today&apos;s song guessing game!
          </p>
        </div>
      </Container>
    );
  }

  if (!gameState) {
    return (
      <Container>
        <div className="text-center py-16">
          <h1 className="text-4xl font-bold text-white mb-4">
            Daily Song Game
          </h1>
          <p className="text-gray-400">
            No game available for today. Check back later!
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      {/* Confetti for celebration */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.08}
          colors={[
            "#4ade80",
            "#22c55e",
            "#16a34a",
            "#15803d",
            "#166534",
            "#fbbf24",
            "#f59e0b",
            "#d97706",
          ]}
          wind={0.02}
        />
      )}

      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Guess today&apos;s song!
          </h1>
          
          {/* Game Progress Indicator */}
          {gameState.gameNumber && gameState.totalGames && (
            <div className="mb-3">
              <div className="bg-gray-800/50 rounded-lg p-3 max-w-sm mx-auto">
                <div className="text-sm text-gray-300 mb-1">
                  Game {gameState.gameNumber} of {gameState.totalGames}
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((gameState.completedGames || 0) / gameState.totalGames) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {gameState.completedGames || 0} completed
                </div>
              </div>
            </div>
          )}
          
          <p className="text-gray-400 mb-4">
            {gameState.hasWon
              ? `You won in ${gameState.attemptCount} attempt${
                  gameState.attemptCount > 1 ? "s" : ""
                }! 🎉`
              : `${gameState.attemptCount} attempt${
                  gameState.attemptCount !== 1 ? "s" : ""
                } made`}
          </p>

          {/* Hints Help Text */}
          {!gameState.hasWon && gameState.canPlayMore && (
            <div className="mb-4">
              {gameState.attemptCount < 3 ? (
                <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 max-w-md mx-auto">
                  <div className="text-blue-300 text-sm text-center">
                    💡 <strong>Hint:</strong> Need help? After 3 attempts, you&apos;ll unlock hints to make guessing easier!
                  </div>
                </div>
              ) : gameState.attemptCount >= 3 ? (
                <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3 max-w-md mx-auto">
                  <div className="text-green-300 text-sm text-center">
                    🎉 <strong>Hints Unlocked!</strong> Scroll down to use helpful hints for this song!
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Color Legend */}
          <div className="flex justify-center items-center gap-6 text-sm bg-gray-800/30 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-green-400">Correct</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-yellow-400">Close</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-red-400">Incorrect</span>
            </div>
          </div>
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
                        <p className="font-medium text-white truncate">
                          {track.name}
                        </p>
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

        {/* Hints Section */}
        {((hintsAvailable && !gameState.hasWon) || (gameState.attemptCount >= 3 && !gameState.hasWon && hintsUsed.length < 3)) && (
          <Card className="p-4 mb-4 bg-slate-800/90 border-slate-600 shadow-lg">
            <div className="mb-3">
              <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
                💡 Hints Available 
                <span className="text-xs text-slate-300">
                  ({3 - hintsUsed.length} left)
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Use hints to help you guess the song.
              </p>
            </div>

            {/* Hint Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Button
                onClick={() => getHint("thumbnail")}
                disabled={hintsUsed.includes("thumbnail") || isGettingHint}
                variant={hintsUsed.includes("thumbnail") ? "secondary" : "outline"}
                className={`p-2 h-auto flex flex-col items-center gap-1 text-xs transition-all duration-200 ${
                  hintsUsed.includes("thumbnail")
                    ? "bg-green-600 border-green-500 text-white shadow-md"
                    : "bg-slate-700 border-slate-500 text-slate-200 hover:bg-purple-600 hover:border-purple-500 hover:text-white hover:shadow-lg"
                }`}
              >
                <span className="text-lg">🖼️</span>
                <div className="text-center">
                  <div className="font-medium">Thumbnail</div>
                </div>
                {hintsUsed.includes("thumbnail") && (
                  <span className="text-xs bg-green-600 px-1 py-0.5 rounded">✓</span>
                )}
              </Button>

              <Button
                onClick={() => getHint("album")}
                disabled={hintsUsed.includes("album") || isGettingHint}
                variant={hintsUsed.includes("album") ? "secondary" : "outline"}
                className={`p-2 h-auto flex flex-col items-center gap-1 text-xs transition-all duration-200 ${
                  hintsUsed.includes("album")
                    ? "bg-green-600 border-green-500 text-white shadow-md"
                    : "bg-slate-700 border-slate-500 text-slate-200 hover:bg-purple-600 hover:border-purple-500 hover:text-white hover:shadow-lg"
                }`}
              >
                <span className="text-lg">💿</span>
                <div className="text-center">
                  <div className="font-medium">Album</div>
                </div>
                {hintsUsed.includes("album") && (
                  <span className="text-xs bg-green-600 px-1 py-0.5 rounded">✓</span>
                )}
              </Button>

              <Button
                onClick={() => getHint("artist")}
                disabled={hintsUsed.includes("artist") || isGettingHint}
                variant={hintsUsed.includes("artist") ? "secondary" : "outline"}
                className={`p-2 h-auto flex flex-col items-center gap-1 text-xs transition-all duration-200 ${
                  hintsUsed.includes("artist")
                    ? "bg-green-600 border-green-500 text-white shadow-md"
                    : "bg-slate-700 border-slate-500 text-slate-200 hover:bg-purple-600 hover:border-purple-500 hover:text-white hover:shadow-lg"
                }`}
              >
                <span className="text-lg">🎤</span>
                <div className="text-center">
                  <div className="font-medium">Artist</div>
                </div>
                {hintsUsed.includes("artist") && (
                  <span className="text-xs bg-green-600 px-1 py-0.5 rounded">✓</span>
                )}
              </Button>
            </div>

            {/* Revealed Hints Display */}
            {Object.keys(revealedHints).length > 0 && (
              <div className="border-t border-slate-600 pt-2">
                <div className="grid grid-cols-3 gap-2">
                  {revealedHints.thumbnail && (
                    <div className="bg-slate-700 border border-slate-600 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-300 mb-1">Cover</div>
                      <img
                        src={revealedHints.thumbnail}
                        alt="Song thumbnail"
                        className="w-12 h-12 rounded-lg mx-auto object-cover border border-slate-500"
                      />
                    </div>
                  )}
                  {revealedHints.album && (
                    <div className="bg-slate-700 border border-slate-600 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-300 mb-1">Album</div>
                      <div className="text-white text-xs font-medium">{revealedHints.album}</div>
                    </div>
                  )}
                  {revealedHints.artist && (
                    <div className="bg-slate-700 border border-slate-600 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-300 mb-1">Artist</div>
                      <div className="text-white text-xs font-medium">{revealedHints.artist}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Mobile Tip */}
        <div className="md:hidden mb-4 p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg">
          <div className="text-blue-300 text-sm text-center">
            💡 <strong>Tip:</strong> Play on desktop for the full experience with all song attributes!
          </div>
        </div>

        {/* Game Grid - Headers */}
        <div className="mb-4">
          {/* Desktop Headers */}
          <div className="hidden md:grid grid-cols-9 gap-2 mb-2">
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">
              Song
            </div>
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">
              Artist
            </div>
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">
              Album
            </div>
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">
              Genre
            </div>
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">
              Year
            </div>
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">
              Popularity
            </div>
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">
              Duration
            </div>
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">
              Explicit
            </div>
            <div className="p-3 bg-gray-800 rounded text-center text-white font-semibold">
              Cover
            </div>
          </div>
          
          {/* Mobile Headers */}
          <div className="md:hidden grid grid-cols-4 gap-1 mb-2">
            <div className="p-2 bg-gray-800 rounded text-center text-white font-semibold text-xs">
              Song
            </div>
            <div className="p-2 bg-gray-800 rounded text-center text-white font-semibold text-xs">
              Artist
            </div>
            <div className="p-2 bg-gray-800 rounded text-center text-white font-semibold text-xs">
              Year
            </div>
            <div className="p-2 bg-gray-800 rounded text-center text-white font-semibold text-xs">
              Cover
            </div>
          </div>

          {/* Attempts */}
          {gameState.attempts.map((attempt, index) => {
            const comparison = comparisons[index];
            const isAnimating = animatingRowIndex === index;

            const getColumnAnimationClass = (columnIndex: number) => {
              if (!isAnimating) return "";
              const isRevealed = columnIndex < revealedColumns;
              if (!isRevealed) {
                return "opacity-30 scale-95";
              }
              return "animate-bounce";
            };

            const getColumnBackgroundColor = (
              columnIndex: number,
              comparisonResult: "correct" | "close" | "incorrect"
            ) => {
              if (isAnimating && columnIndex >= revealedColumns) {
                return "bg-gray-600";
              }
              return getResultColor(comparisonResult);
            };

            return (
              <>
                {/* Desktop Grid */}
                <div key={attempt.id} className="hidden md:grid grid-cols-9 gap-2 mb-2">
                  <div
                    className={`p-3 rounded text-center text-white font-medium transition-all duration-500 ${getColumnBackgroundColor(
                      0,
                      (comparison?.songName || "incorrect") as
                        | "correct"
                        | "close"
                        | "incorrect"
                    )} ${getColumnAnimationClass(0)}`}
                  >
                    {attempt.guessedSongName}
                  </div>
                  <div
                    className={`p-3 rounded text-center text-white font-medium transition-all duration-500 ${getColumnBackgroundColor(
                      1,
                      (comparison?.artistName || "incorrect") as
                        | "correct"
                        | "close"
                        | "incorrect"
                    )} ${getColumnAnimationClass(1)}`}
                  >
                    {attempt.guessedArtistName}
                  </div>
                  <div
                    className={`p-3 rounded text-center text-white font-medium transition-all duration-500 ${getColumnBackgroundColor(
                      2,
                      (comparison?.albumName || "incorrect") as
                        | "correct"
                        | "close"
                        | "incorrect"
                    )} ${getColumnAnimationClass(2)}`}
                  >
                    {attempt.guessedAlbumName || "Unknown"}
                  </div>
                  <div
                    className={`p-3 rounded text-center text-white font-medium transition-all duration-500 ${getColumnBackgroundColor(
                      3,
                      (comparison?.genre || "incorrect") as
                        | "correct"
                        | "close"
                        | "incorrect"
                    )} ${getColumnAnimationClass(3)}`}
                  >
                    {attempt.guessedGenre || "Unknown"}
                  </div>
                  <div
                    className={`p-3 rounded text-center text-white font-medium transition-all duration-500 ${getColumnBackgroundColor(
                      4,
                      (comparison?.releaseYear || "incorrect") as
                        | "correct"
                        | "close"
                        | "incorrect"
                    )} ${getColumnAnimationClass(4)}`}
                  >
                    <div>{attempt.guessedReleaseYear || "Unknown"}</div>
                    {gameState.answer && (
                      <div className="text-xs mt-1">
                        {getDirectionalArrow(
                          attempt.guessedReleaseYear ?? null,
                          gameState.answer.releaseYear ?? null,
                          String(comparison?.releaseYear || "incorrect")
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    className={`p-3 rounded text-center text-white font-medium transition-all duration-500 ${getColumnBackgroundColor(
                      5,
                      (comparison?.popularity || "incorrect") as
                        | "correct"
                        | "close"
                        | "incorrect"
                    )} ${getColumnAnimationClass(5)}`}
                  >
                    <div>{attempt.guessedPopularity || "Unknown"}</div>
                    {gameState.answer && (
                      <div className="text-xs mt-1">
                        {getDirectionalArrow(
                          attempt.guessedPopularity ?? null,
                          gameState.answer.popularity ?? null,
                          String(comparison?.popularity || "incorrect")
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    className={`p-3 rounded text-center text-white font-medium transition-all duration-500 ${getColumnBackgroundColor(
                      6,
                      (comparison?.durationMs || "incorrect") as
                        | "correct"
                        | "close"
                        | "incorrect"
                    )} ${getColumnAnimationClass(6)}`}
                  >
                    <div>{formatDuration(attempt.guessedDurationMs)}</div>
                    {gameState.answer && (
                      <div className="text-xs mt-1">
                        {getDirectionalArrow(
                          attempt.guessedDurationMs ?? null,
                          gameState.answer.durationMs ?? null,
                          String(comparison?.durationMs || "incorrect")
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    className={`p-3 rounded text-center text-white font-medium transition-all duration-500 ${getColumnBackgroundColor(
                      7,
                      (comparison?.isExplicit || "incorrect") as
                        | "correct"
                        | "close"
                        | "incorrect"
                    )} ${getColumnAnimationClass(7)}`}
                  >
                    {attempt.guessedIsExplicit === true
                      ? "Yes"
                      : attempt.guessedIsExplicit === false
                      ? "No"
                      : "Unknown"}
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
                
                {/* Mobile Grid */}
                <div key={`${attempt.id}-mobile`} className="md:hidden grid grid-cols-4 gap-1 mb-2">
                  <div
                    className={`p-2 rounded text-center text-white font-medium text-xs transition-all duration-500 ${getColumnBackgroundColor(
                      0,
                      (comparison?.songName || "incorrect") as
                        | "correct"
                        | "close"
                        | "incorrect"
                    )} ${getColumnAnimationClass(0)}`}
                  >
                    <div className="break-words leading-tight">
                      {attempt.guessedSongName.length > 12 
                        ? `${attempt.guessedSongName.substring(0, 12)}...`
                        : attempt.guessedSongName}
                    </div>
                  </div>
                  <div
                    className={`p-2 rounded text-center text-white font-medium text-xs transition-all duration-500 ${getColumnBackgroundColor(
                      1,
                      (comparison?.artistName || "incorrect") as
                        | "correct"
                        | "close"
                        | "incorrect"
                    )} ${getColumnAnimationClass(1)}`}
                  >
                    <div className="break-words leading-tight">
                      {attempt.guessedArtistName.length > 10 
                        ? `${attempt.guessedArtistName.substring(0, 10)}...`
                        : attempt.guessedArtistName}
                    </div>
                  </div>
                  <div
                    className={`p-2 rounded text-center text-white font-medium text-xs transition-all duration-500 ${getColumnBackgroundColor(
                      4,
                      (comparison?.releaseYear || "incorrect") as
                        | "correct"
                        | "close"
                        | "incorrect"
                    )} ${getColumnAnimationClass(4)}`}
                  >
                    <div>{attempt.guessedReleaseYear || "???"}</div>
                    {gameState.answer && (
                      <div className="text-xs mt-1">
                        {getDirectionalArrow(
                          attempt.guessedReleaseYear ?? null,
                          gameState.answer.releaseYear ?? null,
                          String(comparison?.releaseYear || "incorrect")
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-1 rounded bg-gray-700 flex items-center justify-center">
                    {attempt.guessedImageUrl && (
                      <img
                        src={attempt.guessedImageUrl}
                        alt="Album cover"
                        className="w-8 h-8 rounded object-cover"
                      />
                    )}
                  </div>
                </div>
              </>
            );
          })}
        </div>

        {/* Success Modal - Loldle Style */}
        {showSuccessModal && gameState.hasWon && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-purple-400 rounded-lg p-8 max-w-md w-full mx-4 text-center text-white relative">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded flex items-center justify-center font-bold transition-colors"
              >
                ✕
              </button>

              {/* Success Message */}
              <div className="text-4xl font-bold mb-4">GG WP</div>

              {/* Song Info */}
              <div className="flex items-center justify-center gap-4 mb-6">
                {gameState.answer?.imageUrl && (
                  <img
                    src={gameState.answer.imageUrl}
                    alt="Album cover"
                    className="w-16 h-16 rounded-lg object-cover border-2 border-white"
                  />
                )}
                <div className="text-left">
                  <div className="text-sm opacity-90">You guessed</div>
                  <div className="text-xl font-bold">
                    {gameState.answer?.songName}
                  </div>
                  <div className="text-sm opacity-90">
                    by {gameState.answer?.artistName}
                  </div>
                </div>
              </div>

              {/* Game Progress */}
              {gameState.gameNumber && gameState.totalGames && (
                <div className="bg-purple-500 rounded-lg p-3 mb-4">
                  <div className="text-sm font-semibold">Game Progress</div>
                  <div className="text-lg">
                    Game {gameState.gameNumber} of {gameState.totalGames}
                  </div>
                  <div className="text-sm opacity-90">
                    {gameState.completedGames || 0} games completed today
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="space-y-2 mb-6">
                <div className="text-cyan-200">
                  {completionCount !== null ? (
                    completionCount === 1 ? (
                      <>
                        🎉{" "}
                        <span className="font-bold text-yellow-200">
                          You&apos;re the first
                        </span>{" "}
                        to find the song today!
                      </>
                    ) : (
                      <>
                        You are the{" "}
                        <span className="font-bold text-cyan-100">
                          {completionCount}
                          {completionCount === 2
                            ? "nd"
                            : completionCount === 3
                            ? "rd"
                            : "th"}
                        </span>{" "}
                        to find the song today
                      </>
                    )
                  ) : (
                    <span className="opacity-75">
                      Loading completion stats...
                    </span>
                  )}
                </div>
                <div className="text-lg">
                  Number of tries:{" "}
                  <span className="font-bold text-cyan-100">
                    {gameState.attemptCount}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 mb-6">
                {/* Play Next Game Button - Show if there are more games available */}
                {gameState.gameNumber && 
                 gameState.totalGames && 
                 gameState.completedGames !== undefined &&
                 gameState.completedGames < gameState.totalGames && (
                  <button
                    onClick={playNextGame}
                    disabled={isLoading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    {isLoading ? "Loading..." : `🎮 Play Next Game (${gameState.completedGames + 1}/${gameState.totalGames})`}
                  </button>
                )}
                
                {/* Stats Button */}
                <button
                  onClick={() =>
                    (window.location.href = "/daily-song-game/stats")
                  }
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  📊 Stats
                </button>
              </div>

              {/* Next Song Countdown */}
              <div className="border-t border-green-500 pt-4">
                <div className="text-lg font-semibold mb-2">Next song in</div>
                <div className="text-3xl font-mono font-bold">
                  <CountdownTimer />
                </div>
                <div className="text-sm opacity-75 mt-2">
                  Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game over message */}
        {!gameState.canPlayMore && (
          <div className="text-center mt-8">
            {/* Check if there are more games available today */}
            {gameState.gameNumber && 
             gameState.totalGames && 
             gameState.completedGames !== undefined &&
             gameState.completedGames < gameState.totalGames ? (
              <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-lg p-6 mb-4">
                <p className="text-green-300 text-lg font-semibold mb-2">
                  🎉 Great job! More games available today!
                </p>
                <p className="text-gray-300 mb-4">
                  You&apos;ve completed {gameState.completedGames} out of {gameState.totalGames} games today.
                </p>
                <Button
                  onClick={playNextGame}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white mr-4"
                >
                  {isLoading ? "Loading..." : `🎮 Play Next Game`}
                </Button>
                <Button
                  onClick={() => (window.location.href = "/daily-song-game/stats")}
                  variant="outline"
                  className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
                >
                  View Your Stats
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 mb-4">
                  {gameState.totalGames && gameState.totalGames > 1 
                    ? `Congratulations! You've completed all ${gameState.totalGames} games for today! 🎉`
                    : "Come back tomorrow for a new song to guess!"
                  }
                </p>
                <Button
                  onClick={() => (window.location.href = "/daily-song-game/stats")}
                  variant="outline"
                  className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
                >
                  View Your Stats
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Container>
  );
}
