"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Container from "../../components/core/Container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
  attemptDistribution: Record<number, number>;
  recentGames: Array<{
    date: string;
    won: boolean;
    songName?: string;
    artistName?: string;
  }>;
}

export default function DailySongGameStatsPage() {
  const { data: session } = useSession();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session) {
      loadUserStats();
    }
  }, [session]);

  const loadUserStats = async () => {
    try {
      const response = await fetch("/api/daily-song-game/stats");
      if (response.ok) {
        const data = await response.json();
        setUserStats(data.userStats);
      }
    } catch (error) {
      console.error("Error loading user stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <div className="flex justify-center items-center h-64">
          <div className="text-white text-xl">Loading your stats...</div>
        </div>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container>
        <div className="text-center py-16">
          <h1 className="text-4xl font-bold text-white mb-4">Game Stats</h1>
          <p className="text-gray-400 mb-8">Sign in to view your game statistics!</p>
        </div>
      </Container>
    );
  }

  if (!userStats) {
    return (
      <Container>
        <div className="text-center py-16">
          <h1 className="text-4xl font-bold text-white mb-4">Game Stats</h1>
          <p className="text-gray-400 mb-8">You haven&apos;t played any games yet!</p>
          <Button 
            onClick={() => window.location.href = '/daily-song-game'}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Play Today&apos;s Game
          </Button>
        </div>
      </Container>
    );
  }

  const maxDistributionValue = Math.max(...Object.values(userStats.attemptDistribution));

  return (
    <Container>
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Your Game Statistics
          </h1>
          <p className="text-gray-400">Track your daily song guessing performance</p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-gray-800/50 border-gray-700 text-center">
            <div className="text-3xl font-bold text-white mb-2">
              {userStats.gamesPlayed}
            </div>
            <div className="text-gray-400 text-sm">Games Played</div>
          </Card>
          
          <Card className="p-6 bg-gray-800/50 border-gray-700 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {userStats.winRate}%
            </div>
            <div className="text-gray-400 text-sm">Win Rate</div>
          </Card>
          
          <Card className="p-6 bg-gray-800/50 border-gray-700 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {userStats.currentStreak}
            </div>
            <div className="text-gray-400 text-sm">Current Streak</div>
          </Card>
          
          <Card className="p-6 bg-gray-800/50 border-gray-700 text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {userStats.maxStreak}
            </div>
            <div className="text-gray-400 text-sm">Max Streak</div>
          </Card>
        </div>

        {/* Attempt Distribution */}
        <Card className="p-6 mb-8 bg-gray-800/50 border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Guess Distribution</h3>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map(attempt => {
              const count = userStats.attemptDistribution[attempt] || 0;
              const percentage = maxDistributionValue > 0 ? (count / maxDistributionValue) * 100 : 0;
              
              return (
                <div key={attempt} className="flex items-center gap-3">
                  <div className="w-8 text-white font-medium">{attempt}</div>
                  <div className="flex-1 bg-gray-700 rounded-full h-6 relative">
                    <div 
                      className="bg-green-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-medium">
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recent Games */}
        <Card className="p-6 bg-gray-800/50 border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Recent Games</h3>
          <div className="grid grid-cols-7 gap-2">
            {userStats.recentGames.map((game, index) => (
              <div key={index} className="text-center">
                <div className="text-gray-400 text-xs mb-1">
                  {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div 
                  className={`w-12 h-12 rounded mx-auto flex items-center justify-center text-white font-bold ${
                    game.won ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  title={game.songName ? `${game.songName} - ${game.artistName}` : undefined}
                >
                  {game.won ? '✓' : '✗'}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="text-center mt-8 space-x-4">
          <Button 
            onClick={() => window.location.href = '/daily-song-game'}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Play Today&apos;s Game
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </Container>
  );
}