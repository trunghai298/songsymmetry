"use client";

import React, { useState, useEffect } from "react";
import Container from "../components/core/Container";
import { getMostStreamedSongs } from "./actions";
import MostStreamSongs from "./MostStreamSongs";
import { MostStreamedSong, SongFilters } from "@/types/song";
import { debounce } from "lodash";

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
              Discover trending tracks and find your next favorite song with just a click.
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
    limit: 20,
    year: "2024",
  });
  const [appliedFilters, setAppliedFilters] = useState<SongFilters>({
    limit: 20,
    year: "2024",
  });
  const [topSongs, setTopSongs] = useState<MostStreamedSong[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  return (
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
  );
}

export default Explore;
