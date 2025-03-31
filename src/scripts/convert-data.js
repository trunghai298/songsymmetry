import pkg from "lodash";
import { prisma } from "../prisma/client.js";
const { map } = pkg;

const topAlbums = [
  "",
  "1",
  "<img src='https://i.scdn.co/image/ab67616d0000485149d694203245f241a1bcaa72' alt='ab67616d0000485149d694203245f241a1bcaa72'/>",
  "Bad Bunny Un Verano Sin Ti",
  "Solo - Male",
  '<i><b>Un Verano Sin Ti</b></i> <a href="https://chartmasters.org/edit-album/?album_id=3RQQmkQEvNCY4prGKE6oc5"><img src="https://chartmasters.org/wp-content/uploads/2023/09/Edit-pen.jpg" width="9" height="11" alt="Edit"></a></br><a href="https://chartmasters.org/spotify-streaming-numbers-tool/?artist_name=&rt=tbmstlbm&artist_id=4q3ewBCX7sLwd24euuV69X" \n                    class="styledLink">Bad Bunny</a>',
  "18,702,900,160",
  "6,825,742",
  "19,931,332",
  "Reggaeton",
  "Spanish",
  "2,022",
];

export const convertTopSongs = async () => {
  const data = map(topAlbums, (alb) => {
    const albumMatch = alb[5].match(/<i><b>([^<]+)<\/b><\/i>/);
    const albName = albumMatch ? albumMatch[1].trim() : null;
    const artistMatch = alb[5].match(/class="styledLink">([^<]+)<\/a>/);
    const artist = artistMatch ? artistMatch[1].trim() : null;
    const thumbnail = alb[2];
    const albType = alb[4];
    const streamCount = parseInt(alb[6].replace(/,/g, ""), 10);
    const dailyStreamCount = parseInt(alb[7].replace(/,/g, ""), 10);
    const genre = alb[9];
    const language = alb[10];
    const year = alb[11];

    return {
      albName,
      artist,
      thumbnail,
      albType,
      streamCount,
      dailyStreamCount,
      year,
      genre,
      language,
    };
  });

  const db = await prisma.mostStreamedAlbums.createMany({
    data: data,
  });

  console.log("Done: ", db);
};

convertTopSongs();
