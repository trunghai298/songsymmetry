"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Container from "../components/core/Container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Settings, Play, Calendar, Music, Users, Activity, Server, Database, RefreshCw, Zap, Clock, CheckCircle, XCircle, AlertCircle, Trash2, Trash, Monitor, Download, Upload } from "lucide-react";

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

interface JobData {
  id: string;
  name: string;
  data: any;
  state: string;
  progress: number;
  createdAt: string;
  processedOn?: string;
  finishedOn?: string;
  failedReason?: string;
}

interface QueueStatus {
  name: string;
  jobs: JobData[];
}

interface JobStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

interface ScheduledJob {
  id: string;
  name: string;
  cron?: string;
  next?: number;
  data: any;
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
  const [jobsStatus, setJobsStatus] = useState<{ songUpdates: QueueStatus; dailyGames: QueueStatus } | null>(null);
  const [jobsStats, setJobsStats] = useState<{ songUpdates: JobStats; dailyGames: JobStats } | null>(null);
  const [scheduledJobs, setScheduledJobs] = useState<{ songUpdates: ScheduledJob[]; dailyGames: ScheduledJob[] } | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [workersStatus, setWorkersStatus] = useState<{ workersStarted: boolean; workers: { dailyGame: boolean; songUpdate: boolean } } | null>(null);
  const [systemHealth, setSystemHealth] = useState<{
    database: { connected: boolean; tables: number };
    redis: { connected: boolean };
    songs: { total: number; hasSpotifyData: number };
    albums: { total: number; hasSpotifyData: number };
  } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isSettingUpData, setIsSettingUpData] = useState(false);
  const [setupProgress, setSetupProgress] = useState<{
    stage: string;
    progress: number;
    message: string;
  } | null>(null);

  const isAdminUser = session?.user && (session.user as any).id === ADMIN_USER_ID;

  const fetchRecentGames = useCallback(async () => {
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
  }, [toast]);

  const fetchJobsStatus = useCallback(async () => {
    try {
      setIsLoadingJobs(true);
      const [statusResponse, statsResponse, scheduledResponse, workersResponse] = await Promise.all([
        fetch("/api/admin/jobs?action=status"),
        fetch("/api/admin/jobs?action=stats"),
        fetch("/api/admin/jobs?action=scheduled"),
        fetch("/api/admin/workers")
      ]);
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setJobsStatus(statusData.queues);
      }
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setJobsStats({
          songUpdates: statsData.stats.songUpdates.counts,
          dailyGames: statsData.stats.dailyGames.counts
        });
      }

      if (scheduledResponse.ok) {
        const scheduledData = await scheduledResponse.json();
        setScheduledJobs({
          songUpdates: scheduledData.scheduled?.songUpdates || [],
          dailyGames: scheduledData.scheduled?.dailyGames || []
        });
      }

      if (workersResponse.ok) {
        const workersData = await workersResponse.json();
        setWorkersStatus({
          workersStarted: workersData.workersStarted,
          workers: workersData.workers
        });
      }
    } catch (error) {
      console.error("Error fetching job status:", error);
    } finally {
      setIsLoadingJobs(false);
    }
  }, []);

  const executeJobOperation = async (action: string, type?: string, year?: string) => {
    try {
      setOperationLoading(action);
      
      const requestBody: any = { action };
      if (type) requestBody.type = type;
      if (year) requestBody.year = year;
      
      const response = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Success!",
          description: data.message,
        });
        
        // Refresh job status
        await fetchJobsStatus();
        
        // If it's a game creation, also refresh games
        if (action.includes('game')) {
          await fetchRecentGames();
        }
      } else {
        toast({
          title: "Error",
          description: data.error || data.message || "Operation failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error executing operation:", error);
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      });
    } finally {
      setOperationLoading(null);
    }
  };

  const deleteJob = async (jobId: string, queueName: string) => {
    try {
      setOperationLoading(`delete-${jobId}`);
      
      const response = await fetch(`/api/admin/jobs?action=delete-job&jobId=${jobId}&queue=${queueName}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Success!",
          description: data.message,
        });
        
        // Refresh job status
        await fetchJobsStatus();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete job",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      });
    } finally {
      setOperationLoading(null);
    }
  };

  const manageWorkers = async (action: 'start' | 'stop') => {
    try {
      setOperationLoading(`workers-${action}`);
      
      const response = await fetch('/api/admin/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Success!",
          description: data.message,
        });
        
        // Refresh status
        await fetchJobsStatus();
      } else {
        toast({
          title: "Error",
          description: data.error || `Failed to ${action} workers`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing workers:`, error);
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      });
    } finally {
      setOperationLoading(null);
    }
  };

  const clearScheduledJobs = async (queueName: string) => {
    try {
      setOperationLoading(`clear-scheduled-${queueName}`);
      
      const response = await fetch(`/api/admin/jobs?action=clear-scheduled&queue=${queueName}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Success!",
          description: data.message,
        });
        
        // Refresh job status
        await fetchJobsStatus();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to clear scheduled jobs",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error clearing scheduled jobs:", error);
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      });
    } finally {
      setOperationLoading(null);
    }
  };

  const clearJobs = async (queueName: string, type: 'completed' | 'failed') => {
    try {
      setOperationLoading(`clear-${type}-${queueName}`);
      
      const response = await fetch(`/api/admin/jobs?action=clear-${type}&queue=${queueName}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Success!",
          description: data.message,
        });
        
        // Refresh job status
        await fetchJobsStatus();
      } else {
        toast({
          title: "Error",
          description: data.error || `Failed to clear ${type} jobs`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Error clearing ${type} jobs:`, error);
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      });
    } finally {
      setOperationLoading(null);
    }
  };

  const checkSystemHealth = async () => {
    try {
      setIsCheckingHealth(true);
      const response = await fetch("/api/system/health");
      
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data);
        toast({
          title: "Health Check Complete",
          description: "System status updated",
        });
      } else {
        toast({
          title: "Health Check Failed",
          description: "Unable to get system status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error checking system health:", error);
      toast({
        title: "Error",
        description: "Failed to check system health",
        variant: "destructive",
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const setupSystemData = async () => {
    try {
      setIsSettingUpData(true);
      setSetupProgress({ stage: "Initializing", progress: 0, message: "Starting data setup..." });

      const response = await fetch("/api/system/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        // Poll for progress updates
        const pollProgress = setInterval(async () => {
          try {
            const statusResponse = await fetch("/api/system/health");
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              
              // Update progress based on data counts
              const totalSongs = statusData.songs?.total || 0;
              const totalAlbums = statusData.albums?.total || 0;
              
              if (totalSongs > 0 || totalAlbums > 0) {
                setSetupProgress({
                  stage: "Importing Data",
                  progress: Math.min(90, (totalSongs + totalAlbums) / 100),
                  message: `Imported ${totalSongs} songs and ${totalAlbums} albums`
                });
              }
              
              // Check if setup is complete
              if (totalSongs > 1000 && totalAlbums > 100) {
                clearInterval(pollProgress);
                setSetupProgress({
                  stage: "Complete",
                  progress: 100,
                  message: "Data setup completed successfully!"
                });
                
                setTimeout(() => {
                  setIsSettingUpData(false);
                  setSetupProgress(null);
                  checkSystemHealth();
                }, 2000);
              }
            }
          } catch (error) {
            console.error("Error polling progress:", error);
          }
        }, 2000);

        // Stop polling after 5 minutes
        setTimeout(() => {
          clearInterval(pollProgress);
          if (isSettingUpData) {
            setIsSettingUpData(false);
            setSetupProgress(null);
            toast({
              title: "Setup Timeout",
              description: "Setup is taking longer than expected. Check manually.",
              variant: "default",
            });
          }
        }, 300000);

        toast({
          title: "Data Setup Started",
          description: "This may take several minutes...",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Setup Failed",
          description: errorData.error || "Failed to start data setup",
          variant: "destructive",
        });
        setIsSettingUpData(false);
        setSetupProgress(null);
      }
    } catch (error) {
      console.error("Error setting up data:", error);
      toast({
        title: "Error",
        description: "Failed to start data setup",
        variant: "destructive",
      });
      setIsSettingUpData(false);
      setSetupProgress(null);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && isAdminUser) {
      fetchRecentGames();
      fetchJobsStatus();
      checkSystemHealth();
    }
  }, [status, isAdminUser, fetchRecentGames, fetchJobsStatus]);

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
        const errorMessage = data.error || "Failed to generate daily game";
        const errorDetails = data.details ? ` (${data.details})` : "";
        
        toast({
          title: "Error",
          description: errorMessage + errorDetails,
          variant: "destructive",
        });
        
        console.error("API Error:", data);
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
              {/* eslint-disable-next-line react/no-unescaped-entities */}
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

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check if auto scheduling is enabled for daily games
  const isDailyGamesAutoScheduled = scheduledJobs?.dailyGames && scheduledJobs.dailyGames.length > 0;
  
  // Check if auto scheduling is enabled for song updates  
  const isSongUpdatesAutoScheduled = scheduledJobs?.songUpdates && scheduledJobs.songUpdates.length > 0;

  // Get next execution time for daily games
  const getNextDailyGameExecution = () => {
    if (!scheduledJobs?.dailyGames || scheduledJobs.dailyGames.length === 0) return null;
    
    const nextTimes = scheduledJobs.dailyGames
      .filter(job => job.next)
      .map(job => job.next!)
      .sort((a, b) => a - b);
    
    return nextTimes.length > 0 ? nextTimes[0] : null;
  };

  // Get next execution time for song updates
  const getNextSongUpdateExecution = () => {
    if (!scheduledJobs?.songUpdates || scheduledJobs.songUpdates.length === 0) return null;
    
    const nextTimes = scheduledJobs.songUpdates
      .filter(job => job.next)
      .map(job => job.next!)
      .sort((a, b) => a - b);
    
    return nextTimes.length > 0 ? nextTimes[0] : null;
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

          {/* System Setup & Health */}
          <Card className="bg-gray-800 border-gray-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Monitor className="w-5 h-5 text-purple-400" />
                System Setup & Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* System Health Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${systemHealth?.database.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-white font-medium">Database</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    {systemHealth ? (
                      <>
                        <div>Status: {systemHealth.database.connected ? 'Connected' : 'Disconnected'}</div>
                        <div>Tables: {systemHealth.database.tables}</div>
                      </>
                    ) : (
                      <div>Checking...</div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${systemHealth?.redis.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-white font-medium">Redis</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    Status: {systemHealth ? (systemHealth.redis.connected ? 'Connected' : 'Disconnected') : 'Checking...'}
                  </div>
                </div>

                <div className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Music className="w-4 h-4 text-blue-400" />
                    <span className="text-white font-medium">Songs</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    {systemHealth ? (
                      <>
                        <div>Total: {systemHealth.songs.total.toLocaleString()}</div>
                        <div>With Spotify: {systemHealth.songs.hasSpotifyData.toLocaleString()}</div>
                      </>
                    ) : (
                      <div>Checking...</div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-purple-400" />
                    <span className="text-white font-medium">Albums</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    {systemHealth ? (
                      <>
                        <div>Total: {systemHealth.albums.total.toLocaleString()}</div>
                        <div>With Spotify: {systemHealth.albums.hasSpotifyData.toLocaleString()}</div>
                      </>
                    ) : (
                      <div>Checking...</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Setup Progress */}
              {setupProgress && (
                <div className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-300 font-medium">Setup Progress: {setupProgress.stage}</span>
                    <span className="text-blue-300 text-sm">{Math.round(setupProgress.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${setupProgress.progress}%` }}
                    />
                  </div>
                  <p className="text-blue-200 text-sm">{setupProgress.message}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={checkSystemHealth}
                  disabled={isCheckingHealth}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  {isCheckingHealth ? 'Checking...' : 'Check Health'}
                </Button>
                <Button
                  onClick={setupSystemData}
                  disabled={isSettingUpData || (systemHealth?.songs.total ?? 0) > 1000}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isSettingUpData 
                    ? 'Setting Up...' 
                    : (systemHealth?.songs.total ?? 0) > 1000
                      ? 'Data Already Setup'
                      : 'Setup Data'
                  }
                </Button>
              </div>

              {/* Info Text */}
              <div className="text-xs text-gray-400 bg-gray-700/50 p-3 rounded">
                <p><strong>Setup Data:</strong> Downloads and imports song/album data from external sources. This process may take 5-10 minutes.</p>
                <p className="mt-1"><strong>Health Check:</strong> Verifies database connectivity, Redis status, and data counts.</p>
              </div>
            </CardContent>
          </Card>

          {/* Today's Game Status */}
          <Card className="bg-gray-800 border-gray-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                {/* eslint-disable-next-line react/no-unescaped-entities */}
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
                      {/* eslint-disable-next-line react/no-unescaped-entities */}
                      <p className="text-gray-300">Generate today's daily song game</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={generateTodayGame}
                    disabled={isGenerating}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    {/* eslint-disable-next-line react/no-unescaped-entities */}
                    {isGenerating ? "Generating..." : "Generate Today's Game"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Worker Status */}
          <Card className="bg-gray-800 border-gray-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-purple-400" />
                Background Workers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${workersStatus?.workersStarted ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-white font-medium">
                    Workers Status: {workersStatus?.workersStarted ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => manageWorkers('start')}
                    disabled={operationLoading?.includes('workers-start') || workersStatus?.workersStarted}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    {operationLoading?.includes('workers-start') ? 'Starting...' : 'Start Workers'}
                  </Button>
                  <Button
                    onClick={() => manageWorkers('stop')}
                    disabled={operationLoading?.includes('workers-stop') || !workersStatus?.workersStarted}
                    size="sm"
                    variant="outline"
                    className="border-red-600 text-red-400 hover:bg-red-600/20 disabled:opacity-50"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    {operationLoading?.includes('workers-stop') ? 'Stopping...' : 'Stop Workers'}
                  </Button>
                </div>
              </div>
              
              {workersStatus && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${workersStatus.workers.dailyGame ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                    <span className="text-gray-300">Daily Game Worker</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${workersStatus.workers.songUpdate ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                    <span className="text-gray-300">Song Update Worker</span>
                  </div>
                </div>
              )}
              
              <div className="text-xs text-gray-400 bg-gray-700/50 p-3 rounded">
                <p><strong>Note:</strong> Workers must be running to process background jobs. Start workers before scheduling automatic jobs.</p>
              </div>
            </CardContent>
          </Card>

          {/* Job Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Daily Game Jobs */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Music className="w-5 h-5 text-purple-400" />
                  Daily Game Jobs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Auto Schedule Status */}
                {isDailyGamesAutoScheduled && (
                  <div className="p-3 bg-green-600/20 border border-green-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-medium">Auto Schedule Active</span>
                      </div>
                      <Button
                        onClick={() => clearScheduledJobs('daily-game')}
                        disabled={operationLoading?.includes('clear-scheduled-daily-game')}
                        size="sm"
                        variant="outline"
                        className="border-red-600 text-red-400 hover:bg-red-600/20 h-7"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Disable
                      </Button>
                    </div>
                    {(() => {
                      const nextExecution = getNextDailyGameExecution();
                      return nextExecution ? (
                        <p className="text-sm text-gray-300 mt-2">
                          Next execution: {formatDateTime(nextExecution)}
                        </p>
                      ) : null;
                    })()}
                    <p className="text-xs text-gray-400 mt-1">
                      Schedule: Every 12 hours (00:00 and 12:00 daily)
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => executeJobOperation('create-game-now')}
                    disabled={operationLoading === 'create-game-now'}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {operationLoading === 'create-game-now' ? 'Creating...' : 'Create Game Now'}
                  </Button>
                  <Button
                    onClick={() => executeJobOperation('start-daily-games')}
                    disabled={operationLoading === 'start-daily-games' || isDailyGamesAutoScheduled}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {operationLoading === 'start-daily-games' 
                      ? 'Enabling...' 
                      : isDailyGamesAutoScheduled 
                        ? 'Auto Schedule Active' 
                        : 'Auto Schedule'
                    }
                  </Button>
                </div>
                
                {jobsStats?.dailyGames && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">Completed: {jobsStats.dailyGames.completed}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-gray-300">Failed: {jobsStats.dailyGames.failed}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-400" />
                      <span className="text-gray-300">Waiting: {jobsStats.dailyGames.waiting}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-300">Active: {jobsStats.dailyGames.active}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Song Update Jobs */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-400" />
                  Song Data Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Auto Schedule Status */}
                {isSongUpdatesAutoScheduled && (
                  <div className="p-3 bg-green-600/20 border border-green-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-medium">Auto Schedule Active</span>
                      </div>
                      <Button
                        onClick={() => clearScheduledJobs('song-updates')}
                        disabled={operationLoading?.includes('clear-scheduled-song-updates')}
                        size="sm"
                        variant="outline"
                        className="border-red-600 text-red-400 hover:bg-red-600/20 h-7"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Disable
                      </Button>
                    </div>
                    {(() => {
                      const nextExecution = getNextSongUpdateExecution();
                      return nextExecution ? (
                        <p className="text-sm text-gray-300 mt-2">
                          Next execution: {formatDateTime(nextExecution)}
                        </p>
                      ) : null;
                    })()}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => executeJobOperation('run-song-update', 'daily')}
                    disabled={operationLoading === 'run-song-update-daily'}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    {operationLoading === 'run-song-update-daily' ? 'Running...' : 'Daily Update'}
                  </Button>
                  <Button
                    onClick={() => executeJobOperation('run-song-update', 'weekly')}
                    disabled={operationLoading === 'run-song-update-weekly'}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    {operationLoading === 'run-song-update-weekly' ? 'Running...' : 'Weekly Update'}
                  </Button>
                  <Button
                    onClick={() => executeJobOperation('run-song-update', 'year', '2025')}
                    disabled={operationLoading === 'run-song-update-year'}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    {operationLoading === 'run-song-update-year' ? 'Running...' : '2025 Update'}
                  </Button>
                  <Button
                    onClick={() => executeJobOperation('start-song-updates')}
                    disabled={operationLoading === 'start-song-updates' || isSongUpdatesAutoScheduled}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {operationLoading === 'start-song-updates' 
                      ? 'Enabling...' 
                      : isSongUpdatesAutoScheduled 
                        ? 'Auto Active' 
                        : 'Auto Schedule'
                    }
                  </Button>
                </div>
                
                {jobsStats?.songUpdates && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">Completed: {jobsStats.songUpdates.completed}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-gray-300">Failed: {jobsStats.songUpdates.failed}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-400" />
                      <span className="text-gray-300">Waiting: {jobsStats.songUpdates.waiting}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-300">Active: {jobsStats.songUpdates.active}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Job Status Monitor */}
          <Card className="bg-gray-800 border-gray-700 mb-8">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-purple-400" />
                Job Monitor
              </CardTitle>
              <Button
                onClick={fetchJobsStatus}
                disabled={isLoadingJobs}
                size="sm"
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingJobs ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingJobs ? (
                <div className="text-gray-400 text-center py-4">Loading job status...</div>
              ) : jobsStatus ? (
                <div className="space-y-6">
                  {/* Recent Jobs */}
                  {Object.entries(jobsStatus).map(([queueName, queue]) => (
                    <div key={queueName}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-white font-semibold capitalize">
                          {queueName.replace(/([A-Z])/g, ' $1').trim()} Queue
                        </h4>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => clearJobs(queue.name, 'completed')}
                            disabled={operationLoading?.includes(`clear-completed-${queue.name}`)}
                            size="sm"
                            variant="outline"
                            className="border-green-600 text-green-400 hover:bg-green-600/20 h-7 text-xs"
                          >
                            <Trash className="w-3 h-3 mr-1" />
                            Clear Completed
                          </Button>
                          <Button
                            onClick={() => clearJobs(queue.name, 'failed')}
                            disabled={operationLoading?.includes(`clear-failed-${queue.name}`)}
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-400 hover:bg-red-600/20 h-7 text-xs"
                          >
                            <Trash className="w-3 h-3 mr-1" />
                            Clear Failed
                          </Button>
                        </div>
                      </div>
                      {queue.jobs.length > 0 ? (
                        <div className="space-y-2">
                          {queue.jobs.slice(0, 5).map((job) => {
                            const getStateIcon = (state: string) => {
                              switch (state) {
                                case 'completed':
                                  return <CheckCircle className="w-4 h-4 text-green-400" />;
                                case 'failed':
                                  return <XCircle className="w-4 h-4 text-red-400" />;
                                case 'active':
                                  return <Activity className="w-4 h-4 text-blue-400" />;
                                case 'waiting':
                                  return <Clock className="w-4 h-4 text-yellow-400" />;
                                default:
                                  return <AlertCircle className="w-4 h-4 text-gray-400" />;
                              }
                            };

                            return (
                              <div
                                key={job.id}
                                className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg text-sm"
                              >
                                {getStateIcon(job.state)}
                                <div className="flex-1">
                                  <div className="text-white font-medium">
                                    Job #{job.id} - {job.data?.type || job.name || 'Unknown'}
                                  </div>
                                  <div className="text-gray-400 text-xs">
                                    Created: {new Date(job.createdAt).toLocaleString()}
                                    {job.finishedOn && (
                                      <span className="ml-2">
                                        Finished: {new Date(job.finishedOn).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  {job.failedReason && (
                                    <div className="text-red-400 text-xs mt-1">
                                      Error: {job.failedReason}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                                    job.state === 'completed' 
                                      ? 'bg-green-600/20 text-green-400'
                                      : job.state === 'failed'
                                      ? 'bg-red-600/20 text-red-400'
                                      : job.state === 'active'
                                      ? 'bg-blue-600/20 text-blue-400'
                                      : 'bg-yellow-600/20 text-yellow-400'
                                  }`}>
                                    {job.state}
                                  </div>
                                  {(job.state === 'waiting' || job.state === 'failed' || job.state === 'completed') && (
                                    <Button
                                      onClick={() => deleteJob(job.id, queue.name)}
                                      disabled={operationLoading === `delete-${job.id}`}
                                      size="sm"
                                      variant="outline"
                                      className="border-red-600 text-red-400 hover:bg-red-600/20 h-6 w-6 p-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-sm">No recent jobs</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-4">
                  Click refresh to load job status
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
                        <Image
                          src={game.imageUrl}
                          alt={game.songName}
                          width={48}
                          height={48}
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