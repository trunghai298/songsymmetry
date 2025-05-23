// Script to fetch all songs from chartmasters.org
// Fetches the complete dataset of 2980 songs across all languages
const fs = require("fs");
const path = require("path");

/**
 * Script to fetch all songs data from chartmasters.org
 * This gets the complete dataset of all songs across all languages and years
 * @param {Object} options - Options for fetching data
 * @param {number} options.limit - Maximum number of songs to fetch (default: 2980 for complete dataset)
 * @param {boolean} options.fetchAll - If true, fetch all pages until no more data (default: true)
 */
async function fetchAllSongs(options = { limit: 2980, fetchAll: true }) {
  const url =
    "https://chartmasters.org/wp-admin/admin-ajax.php?action=get_wdtable&table_id=46";

  // Request headers to mimic a browser request
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Content-Type": "application/x-www-form-urlencoded",
    Referer: "https://chartmasters.org/streaming-songs-chart/",
    Origin: "https://chartmasters.org",
  };

  // POST body parameters for fetching all songs
  const params = new URLSearchParams({
    draw: "5",
    "columns[0][data]": "0",
    "columns[0][name]": "rank",
    "columns[0][searchable]": "false",
    "columns[0][orderable]": "true",
    "columns[0][search][value]": "",
    "columns[0][search][regex]": "false",
    "columns[1][data]": "1",
    "columns[1][name]": "g#",
    "columns[1][searchable]": "false",
    "columns[1][orderable]": "true",
    "columns[1][search][value]": "",
    "columns[1][search][regex]": "false",
    "columns[2][data]": "2",
    "columns[2][name]": "Title",
    "columns[2][searchable]": "true",
    "columns[2][orderable]": "true",
    "columns[2][search][value]": "",
    "columns[2][search][regex]": "false",
    "columns[3][data]": "3",
    "columns[3][name]": "Artist",
    "columns[3][searchable]": "true",
    "columns[3][orderable]": "true",
    "columns[3][search][value]": "",
    "columns[3][search][regex]": "false",
    "columns[4][data]": "4",
    "columns[4][name]": "image_url",
    "columns[4][searchable]": "false",
    "columns[4][orderable]": "true",
    "columns[4][search][value]": "",
    "columns[4][search][regex]": "false",
    "columns[5][data]": "5",
    "columns[5][name]": "Song",
    "columns[5][searchable]": "false",
    "columns[5][orderable]": "true",
    "columns[5][search][value]": "",
    "columns[5][search][regex]": "false",
    "columns[6][data]": "6",
    "columns[6][name]": "playcount",
    "columns[6][searchable]": "false",
    "columns[6][orderable]": "true",
    "columns[6][search][value]": "",
    "columns[6][search][regex]": "false",
    "columns[7][data]": "7",
    "columns[7][name]": "dailyStreams",
    "columns[7][searchable]": "false",
    "columns[7][orderable]": "true",
    "columns[7][search][value]": "",
    "columns[7][search][regex]": "false",
    "columns[8][data]": "8",
    "columns[8][name]": "year",
    "columns[8][searchable]": "true",
    "columns[8][orderable]": "true",
    "columns[8][search][value]": "",
    "columns[8][search][regex]": "false",
    "columns[9][data]": "9",
    "columns[9][name]": "genre",
    "columns[9][searchable]": "true",
    "columns[9][orderable]": "true",
    "columns[9][search][value]": "",
    "columns[9][search][regex]": "false",
    "columns[10][data]": "10",
    "columns[10][name]": "language",
    "columns[10][searchable]": "true",
    "columns[10][orderable]": "true",
    "columns[10][search][value]": "", // No language filter to see all data
    "columns[10][search][regex]": "false",
    "order[0][column]": "6", // Order by playcount
    "order[0][dir]": "desc", // Descending order
    start: "0",
    length: options.limit?.toString() || "2980",
    "search[value]": "",
    "search[regex]": "false",
    wdtNonce: "c07de49227",
    sRangeSeparator: "|",
  });

  let allData = [];
  let start = 0;
  const batchSize = 100; // Fetch in smaller batches to avoid timeouts

  try {
    console.log("Fetching all songs from chartmasters.org...");

    // If not fetching all, just make one request
    if (!options.fetchAll) {
      params.set("start", start.toString());
      params.set("length", options.limit?.toString() || "2980");
      
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      allData = data.data;
    } else {
      // Fetch all pages
      let hasMoreData = true;
      let totalFetched = 0;

      while (hasMoreData && totalFetched < (options.limit || 2980)) {
        params.set("start", start.toString());
        params.set("length", Math.min(batchSize, (options.limit || 2980) - totalFetched).toString());

        console.log(`Fetching batch starting at ${start}...`);

        const response = await fetch(url, {
          method: "POST",
          headers: headers,
          body: params.toString(),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
          allData = allData.concat(data.data);
          totalFetched += data.data.length;
          start += data.data.length;
          
          console.log(`Fetched ${data.data.length} songs (total: ${totalFetched})`);
          
          // Check if we've reached the end or got less than requested
          if (data.data.length < batchSize) {
            hasMoreData = false;
          }
        } else {
          hasMoreData = false;
        }

        // Add a small delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Successfully fetched ${allData.length} songs.`);

    // Log raw data first to check structure
    if (allData.length > 0) {
      console.log("Raw data example (first item):", allData[0]);
    }

    // Process the data to a cleaner format
    const processedData = allData.map((item) => {
      // Extract the numeric part from the playcount string
      const playCountStr = item[6];
      const playcountMatch = playCountStr.match(/[\d,]+/);
      const playcount = playcountMatch
        ? parseInt(playcountMatch[0].replace(/,/g, ""), 10)
        : 0;

      // Extract image URL from HTML
      const imageHTML = item[4];
      const imageMatch = imageHTML.match(/src="([^"]+)"/);
      const imageUrl = imageMatch ? imageMatch[1] : "";

      // Extract daily streams
      const dailyStreamStr = item[7] || "0";
      const dailyStreams = parseInt(dailyStreamStr.replace(/,/g, ""), 10) || 0;

      return {
        rank: parseInt(item[0], 10),
        title: item[2],
        artist: item[3],
        imageUrl: imageUrl,
        streamCount: playcount,
        dailyStreamCount: dailyStreams,
        year: item[8],
        genre: item[9],
        language: item[10],
      };
    });

    // Log a few processed items to check format
    if (processedData.length > 0) {
      console.log("Processed songs data (first 3 items):");
      console.log(JSON.stringify(processedData.slice(0, 3), null, 2));
    }

    // Save the processed data to a JSON file
    const outputPath = path.join(__dirname, "all-songs-data.json");
    fs.writeFileSync(outputPath, JSON.stringify(processedData, null, 2));
    console.log(`All songs data saved to ${outputPath}`);

    return processedData;
  } catch (error) {
    console.error("Error fetching songs:", error);
    throw error;
  }
}

// Function to parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = { limit: 2980, fetchAll: true };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && i + 1 < args.length) {
      options.limit = parseInt(args[i + 1], 10);
      i++; // Skip the next argument as it's the value
    }
  }

  return options;
}

// Add the ability to run this script directly
if (require.main === module) {
  // Parse command line arguments
  const options = parseArgs();

  console.log(`Starting all songs fetch with limit: ${options.limit}`);

  fetchAllSongs(options)
    .then((data) => {
      console.log(`Finished processing ${data.length} songs`);
    })
    .catch((err) => {
      console.error("Script failed:", err);
      process.exit(1);
    });
}

// Export the function for use in other scripts
module.exports = { fetchAllSongs };