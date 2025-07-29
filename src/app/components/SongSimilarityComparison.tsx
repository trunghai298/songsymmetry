import React, { useState } from "react";
import { useAISearch } from "@/hooks/useAISearch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader } from "./core/Loader";

interface Song {
  title: string;
  artist: string;
}

export default function SongSimilarityComparison() {
  const { analyzeSimilarity, isLoading, error } = useAISearch();
  const [song1, setSong1] = useState<Song>({ title: "", artist: "" });
  const [song2, setSong2] = useState<Song>({ title: "", artist: "" });
  const [result, setResult] = useState<{
    similarity: number;
    explanation: string;
  } | null>(null);

  const handleCompare = async () => {
    if (!song1.title || !song1.artist || !song2.title || !song2.artist) {
      return;
    }

    const similarity = await analyzeSimilarity(song1, song2);
    if (similarity) {
      setResult(similarity);
    }
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getSimilarityLabel = (score: number) => {
    if (score >= 80) return "Very Similar";
    if (score >= 60) return "Similar";
    if (score >= 40) return "Somewhat Similar";
    return "Not Very Similar";
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
      <CardHeader className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <CardTitle className="flex items-center gap-2 relative z-10 text-white">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
            <i className="bi bi-diagram-3 text-white text-lg" />
          </div>
          Song Similarity Comparison
        </CardTitle>
        <CardDescription className="text-gray-400 relative z-10">
          Compare two songs to see how similar they are
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
            <h3 className="font-semibold text-sm text-white flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                1
              </div>
              First Song
            </h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="song1-title" className="text-gray-300">Title</Label>
                <Input
                  id="song1-title"
                  placeholder="Enter song title"
                  value={song1.title}
                  onChange={(e) => setSong1({ ...song1, title: e.target.value })}
                  className="bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="song1-artist" className="text-gray-300">Artist</Label>
                <Input
                  id="song1-artist"
                  placeholder="Enter artist name"
                  value={song1.artist}
                  onChange={(e) => setSong1({ ...song1, artist: e.target.value })}
                  className="bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
            <h3 className="font-semibold text-sm text-white flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                2
              </div>
              Second Song
            </h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="song2-title" className="text-gray-300">Title</Label>
                <Input
                  id="song2-title"
                  placeholder="Enter song title"
                  value={song2.title}
                  onChange={(e) => setSong2({ ...song2, title: e.target.value })}
                  className="bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="song2-artist" className="text-gray-300">Artist</Label>
                <Input
                  id="song2-artist"
                  placeholder="Enter artist name"
                  value={song2.artist}
                  onChange={(e) => setSong2({ ...song2, artist: e.target.value })}
                  className="bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleCompare}
          disabled={
            isLoading ||
            !song1.title ||
            !song1.artist ||
            !song2.title ||
            !song2.artist
          }
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isLoading ? (
            <>
              <Loader className="mr-2 h-4 w-4" />
              Analyzing...
            </>
          ) : (
            <>
              <i className="bi bi-search mr-2" />
              Compare Songs
            </>
          )}
        </Button>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {result && (
          <div className="space-y-4 p-6 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-xl border border-gray-600 backdrop-blur-sm">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-300">Similarity Score</span>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-4xl font-bold ${getSimilarityColor(
                      result.similarity
                    )}`}
                  >
                    {result.similarity}%
                  </span>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    result.similarity >= 80 ? 'bg-green-500/20 text-green-400' :
                    result.similarity >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                    result.similarity >= 40 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {getSimilarityLabel(result.similarity)}
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="h-4 bg-gray-900/50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-700 ease-out rounded-full bg-gradient-to-r ${
                      result.similarity >= 80 ? 'from-green-500 to-emerald-400' :
                      result.similarity >= 60 ? 'from-yellow-500 to-amber-400' :
                      result.similarity >= 40 ? 'from-orange-500 to-orange-400' :
                      'from-red-500 to-rose-400'
                    }`}
                    style={{ width: `${result.similarity}%` }}
                  >
                    <div className="h-full bg-white/20 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg">
                  <i className="bi bi-lightbulb text-purple-400" />
                </div>
                <h4 className="font-semibold text-white">Analysis</h4>
              </div>
              <p className="text-gray-300 leading-relaxed pl-10">
                {result.explanation}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-start gap-2 text-xs text-gray-400">
                <i className="bi bi-info-circle mt-0.5" />
                <p>This analysis considers musical style, era, genre, themes, and cultural context to provide accurate similarity scores.</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
