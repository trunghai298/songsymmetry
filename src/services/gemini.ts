import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

interface SongSearchResult {
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string;
  relevanceScore: number;
  explanation: string;
}

export async function searchSongsWithGemini(
  query: string,
  existingSongs?: Array<{
    title: string;
    artist: string;
    album?: string;
    year?: number;
  }>
): Promise<SongSearchResult[]> {
  try {
    const prompt = `You are a music expert helping users find songs. Given the search query: "${query}"${
      existingSongs
        ? `\n\nConsidering these existing songs:\n${existingSongs
            .map((s) => `- ${s.title} by ${s.artist}`)
            .join("\n")}`
        : ""
    }

Please suggest relevant songs based on the query. Consider:
- Direct song/artist searches
- Mood-based searches (e.g., "sad songs", "workout music")
- Era-based searches (e.g., "80s hits", "modern pop")
- Genre searches (e.g., "jazz classics", "indie rock")
- Lyrical content searches

Return ONLY a valid JSON array with 5-10 songs. Each song object must have these exact fields:
{
  "title": "Song Title",
  "artist": "Artist Name",
  "album": "Album Name",
  "year": 1999,
  "genre": "Genre",
  "relevanceScore": 85,
  "explanation": "Brief explanation of why this matches"
}

Important: Return ONLY the JSON array, no other text or markdown.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not parse song suggestions from Gemini response");
    }

    const songs = JSON.parse(jsonMatch[0]) as SongSearchResult[];

    // Sort by relevance score
    return songs.sort((a, b) => b.relevanceScore - a.relevanceScore);
  } catch (error) {
    console.error("Error searching songs with Gemini:", error);
    throw error;
  }
}

export async function analyzeSongSimilarity(
  song1: { title: string; artist: string },
  song2: { title: string; artist: string }
): Promise<{ similarity: number; explanation: string }> {
  try {
    const prompt = `Compare these two songs and rate their similarity:
Song 1: "${song1.title}" by ${song1.artist}
Song 2: "${song2.title}" by ${song2.artist}

Consider musical style, era, genre, themes, and cultural context.

Return ONLY a valid JSON object with exactly these fields:
{
  "similarity": 75,
  "explanation": "Explanation of the similarity"
}

The similarity should be a number from 0-100. Return ONLY the JSON, no other text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(
        "Could not parse similarity analysis from Gemini response"
      );
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error analyzing song similarity with Gemini:", error);
    throw error;
  }
}

export async function generateSongRecommendations(
  userHistory: Array<{ title: string; artist: string; playCount: number }>,
  limit: number = 10
): Promise<SongSearchResult[]> {
  try {
    const topSongs = userHistory
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 10)
      .map((s) => `${s.title} by ${s.artist} (played ${s.playCount} times)`)
      .join("\n");

    const prompt = `Based on this listening history, recommend ${limit} songs the user might enjoy:

${topSongs}

Provide diverse recommendations that match their taste but also introduce some variety.

Return ONLY a valid JSON array with song recommendations. Each object must have:
{
  "title": "Song Title",
  "artist": "Artist Name", 
  "album": "Album Name",
  "year": 1999,
  "genre": "Genre",
  "relevanceScore": 85,
  "explanation": "Why this recommendation fits"
}

Return ONLY the JSON array, no other text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not parse recommendations from Gemini response");
    }

    return JSON.parse(jsonMatch[0]) as SongSearchResult[];
  } catch (error) {
    console.error("Error generating recommendations with Gemini:", error);
    throw error;
  }
}
