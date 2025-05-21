import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MostStreamedSong, SongFilters } from "@/types/song";
import { map, startCase } from "lodash";
import { Filter, FilterX } from "lucide-react";
import { useState } from "react";

function MostStreamSongs({
  songs,
  filters,
  setFilters,
}: {
  songs: MostStreamedSong[];
  filters: SongFilters;
  setFilters: (filters: SongFilters) => void;
}) {
  const [openFilter, setOpenFilter] = useState(false);

  const getTrackImage = (thumbnail: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(thumbnail), "text/html");
    const img = doc.querySelector("img");
    return img?.src || "";
  };

  return (
    <div className="w-full flex flex-col space-y-4 relative">
      <h2 className="text-2xl text-white font-bold">Most Streamed Songs</h2>
      <div className="w-full flex flex-row justify-between">
        <div className="flex flex-row space-x-2 items-center">
          {Object.entries(filters).map(([key, value]) => (
            <div key={key} className="flex flex-row space-x-1">
              {key === "limit" && (
                <Badge className="font-medium" variant="outline">
                  Total Songs: {songs.length}
                </Badge>
              )}
              {key !== "limit" && value && (
                <Badge className="font-medium" variant="outline">
                  {startCase(key)} :{" "}
                  {typeof value === "object" ? value.join(", ") : value}
                </Badge>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-row space-x-2">
          {openFilter ? (
            <FilterX
              className="cursor-pointer"
              onClick={() => setOpenFilter(false)}
            />
          ) : (
            <Filter
              className="cursor-pointer"
              onClick={() => setOpenFilter(true)}
            />
          )}
        </div>
      </div>
      {openFilter && (
        <div className="w-full flex flex-row space-x-2 transition-all duration-300">
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Input
              className="user-select-none"
              type="text"
              placeholder="Search by name"
              value={filters.name}
              onChange={(e) => {
                const name = e.target.value;
                setFilters({
                  ...filters,
                  name: name === "" ? undefined : e.target.value,
                });
              }}
            />
            <Input
              type="text"
              placeholder="Search by artist, comma separated"
              value={filters.artist}
              onChange={(e) => {
                const names = e.target.value;
                setFilters({
                  ...filters,
                  artist: names === "" ? undefined : e.target.value,
                });
              }}
            />
            <Input
              type="text"
              placeholder="Search by genre, comma separated"
              value={filters.genre}
              onChange={(e) => {
                const genre = e.target.value;
                setFilters({
                  ...filters,
                  genre:
                    genre === "" ? undefined : Array.from(genre.split(",")),
                });
              }}
            />
            <Input
              type="text"
              placeholder="Search by year"
              value={filters.year}
              onChange={(e) => {
                const year = e.target.value;
                setFilters({
                  ...filters,
                  year: year === "" ? undefined : year,
                });
              }}
            />
            <Input
              type="text"
              placeholder="Search by language, comma separated"
              value={filters.language}
              onChange={(e) => {
                const language = e.target.value;
                setFilters({
                  ...filters,
                  language:
                    language === ""
                      ? undefined
                      : Array.from(language.split(",")),
                });
              }}
            />
            <Input
              type="number"
              placeholder="Number of songs"
              value={filters.limit}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  limit: Number(e.target.value),
                })
              }
            />
          </div>
        </div>
      )}
      <div className="flex flex-row space-x-2">
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {map(songs, (track) => (
            <div
              className={`
            relative
            text-white
            font-sans
            cursor-pointer

            before:content-[''] 
            before:absolute 
            before:rounded-full 
            before:w-[6rem] 
            before:h-[6rem] 
            before:top-[30%] 
            before:right-[7%]

            after:content-[''] 
            after:absolute 
            after:h-[3rem] 
            after:top-[8%] 
            after:right-[5%] 
            after:border 
            after:border-solid 
            after:border-white/50
          `}
              style={{
                backgroundImage: `url(${getTrackImage(
                  String(track.thumbnail)
                )})`,
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                borderRadius: "0.7rem",
              }}
              key={track.id}
            >
              <div
                className="
              h-[14rem]
              p-4
              bg-[rgba(255,255,255,0.074)]
              border
              border-[rgba(255,255,255,0.222)]
              backdrop-blur-[20px]
              rounded-[0.7rem]
              flex
              flex-col
              justify-between
              transition-all
              ease-in-out
              duration-300
      
              hover:shadow-[0_0_20px_1px_#ffbb763f]
              hover:border-[rgba(255,255,255,0.454)]
            "
              >
                <span className="text-2xl font-medium line-clamp-3 text-ellipsis overflow-hidden">
                  {track.name}
                </span>
                <div>
                  <strong className="block mb-2 line-clamp-3 text-ellipsis overflow-hidden">
                    {track.artist}
                  </strong>
                  <p className="m-0 text-[0.7em] font-light">
                    {track.streamCount
                      ? `${new Intl.NumberFormat("de-DE").format(
                          track.streamCount
                        )} streams`
                      : ""}
                  </p>
                  <span className="text-[0.8rem] font-light mr-[0.2rem]">
                    {track.genre}
                  </span>
                  <span className="text-[0.6rem] font-light">
                    | {track.year}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MostStreamSongs;
