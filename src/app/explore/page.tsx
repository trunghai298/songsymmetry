"use client";

import React, { useState, useEffect } from "react";
import Container from "../components/core/Container";
import { getMostStreamedSongs } from "./actions";
import MostStreamSongs from "./MostStreamSongs";
import { MostStreamedSong, SongFilters } from "@/types/song";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectPlayerTrack } from "@/lib/redux/selectors";

const WelcomeSection = () => {
  return (
    <section className="w-full py-4 md:py-8 lg:py-12 xl:py-18">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="">
            <h1 className="text-3xl text-white font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
              Explore Your Music Universe
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl py-4 dark:text-gray-400">
              Discover trending tracks and find your next favorite song with
              just a click.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

function Explore() {
  // Split filters into state and applied filters
  const [filterState, setFilterState] = useState<SongFilters>({
    limit: 50,
    year: "",
  });
  const [appliedFilters, setAppliedFilters] = useState<SongFilters>({
    limit: 50,
    year: "",
  });
  const [topSongs, setTopSongs] = useState<MostStreamedSong[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get current playing track from Redux
  const currentTrack = useAppSelector(selectPlayerTrack);
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [previousBackgroundImage, setPreviousBackgroundImage] =
    useState<string>("");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Non-debounced fetch function - will only be called when search button is clicked
  const fetchTopSongs = async (filters: SongFilters) => {
    setIsLoading(true);
    try {
      const data = await getMostStreamedSongs(filters);
      setTopSongs(data);
    } catch (error) {
      console.error("Error fetching songs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply the filters when search button is clicked
  const handleApplyFilters = () => {
    console.log("Applying filters:", filterState);
    setAppliedFilters(filterState);
  };

  // Only fetch when applied filters change (when search button is clicked)
  useEffect(() => {
    console.log("Fetching top songs with applied filters", appliedFilters);
    fetchTopSongs(appliedFilters);
  }, [appliedFilters]);

  // Update background when current track changes
  useEffect(() => {
    console.log("Current track changed:", currentTrack);
    if (currentTrack?.album?.images?.[0]?.url) {
      const newImage = currentTrack.album.images[0].url;
      console.log("Setting background image:", newImage);

      // If no previous background, just fade in the new one
      if (!backgroundImage) {
        setBackgroundImage(newImage);
        setIsTransitioning(true);
        // End transition after animation completes
        setTimeout(() => {
          setIsTransitioning(false);
        }, 2100);
      } else {
        // Crossfade between backgrounds
        setIsTransitioning(true);
        setPreviousBackgroundImage(backgroundImage);

        // Small delay to ensure the previous image is set
        setTimeout(() => {
          setBackgroundImage(newImage);
        }, 50);

        // End transition after animation completes
        setTimeout(() => {
          setIsTransitioning(false);
          setPreviousBackgroundImage("");
        }, 2100);
      }
    } else {
      console.log("No album image found for track:", currentTrack);
      // Fade out current background if no track
      if (backgroundImage) {
        setIsTransitioning(true);
        setPreviousBackgroundImage(backgroundImage);
        setBackgroundImage("");
        setTimeout(() => {
          setIsTransitioning(false);
          setPreviousBackgroundImage("");
        }, 2100);
      }
    }
  }, [currentTrack]);

  return (
    <div className="relative min-h-screen bg-gray-900">
      {/* Animated background with crossfade */}
      <div className="fixed inset-0 z-0">
        {/* Previous background image (fading out) */}
        {previousBackgroundImage && (
          <div
            className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
            style={{
              backgroundImage: `url(${previousBackgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              filter: "blur(6px) brightness(0.55)",
              opacity: isTransitioning ? 0 : 1,
            }}
          />
        )}

        {/* Current background image (fading in) */}
        <div
          className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
          style={{
            backgroundImage: backgroundImage
              ? `url(${backgroundImage})`
              : "linear-gradient(to bottom, #111827, #000000)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            filter: backgroundImage ? "blur(6px) brightness(0.55)" : "none",
            opacity: backgroundImage && !isTransitioning ? 1 : 0,
          }}
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.6), rgba(0,0,0,0.8))",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Debug info */}
        {process.env.NODE_ENV === "development" && (
          <div className="fixed top-4 right-4 z-50 p-2 bg-black/80 text-white text-xs rounded">
            <div>Track: {currentTrack?.name || "None"}</div>
            <div>Background: {backgroundImage ? "Set" : "None"}</div>
            <div>
              URL:{" "}
              {backgroundImage
                ? backgroundImage.substring(0, 50) + "..."
                : "None"}
            </div>
          </div>
        )}

        <Container>
          <WelcomeSection />
          <MostStreamSongs
            songs={topSongs}
            filters={filterState}
            setFilters={setFilterState}
            onApplyFilters={handleApplyFilters}
            isLoading={isLoading}
          />
        </Container>
      </div>
    </div>
  );
}

export default Explore;
