// Use built-in fetch API for Node.js versions 18+
const fs = require("fs");
const path = require("path");

/**
 * Script to fetch album data from chartmasters.org and save to a JSON file
 * This gets the most streamed albums data from their data table
 * API endpoint: table_id=7 for albums
 * Total records: 7,147 albums
 */
async function fetchChartmastersAlbumsData() {
  const url = "https://chartmasters.org/wp-admin/admin-ajax.php?action=get_wdtable&table_id=7";

  // Request headers to mimic a browser request
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Content-Type": "application/x-www-form-urlencoded",
    Referer: "https://chartmasters.org/streaming-albums-chart/",
    Origin: "https://chartmasters.org",
  };

  let allAlbums = [];
  let start = 0;
  const length = 100; // Fetch 100 records per request
  const totalRecords = 7147; // Total number of albums
  
  console.log(`Starting to fetch ${totalRecords} albums from ChartMasters...`);

  while (start < totalRecords) {
    console.log(`Fetching albums ${start + 1} to ${Math.min(start + length, totalRecords)}...`);

    // The POST body parameters for albums API
    const params = new URLSearchParams({
      draw: "2",
      "columns[0][data]": "0",
      "columns[0][name]": "rank",
      "columns[0][searchable]": "false",
      "columns[0][orderable]": "true",
      "columns[0][search][value]": "",
      "columns[0][search][regex]": "false",
      "columns[1][data]": "1",
      "columns[1][name]": "g#",
      "columns[1][searchable]": "true",
      "columns[1][orderable]": "true",
      "columns[1][search][value]": "",
      "columns[1][search][regex]": "false",
      "columns[2][data]": "2",
      "columns[2][name]": "Cover",
      "columns[2][searchable]": "false",
      "columns[2][orderable]": "false",
      "columns[2][search][value]": "",
      "columns[2][search][regex]": "false",
      "columns[3][data]": "3",
      "columns[3][name]": "ArtistName",
      "columns[3][searchable]": "true",
      "columns[3][orderable]": "false",
      "columns[3][search][value]": "",
      "columns[3][search][regex]": "false",
      "columns[4][data]": "4",
      "columns[4][name]": "Gender",
      "columns[4][searchable]": "true",
      "columns[4][orderable]": "false",
      "columns[4][search][value]": "",
      "columns[4][search][regex]": "false",
      "columns[5][data]": "5",
      "columns[5][name]": "Album",
      "columns[5][searchable]": "false",
      "columns[5][orderable]": "true",
      "columns[5][search][value]": "",
      "columns[5][search][regex]": "false",
      "columns[6][data]": "6",
      "columns[6][name]": "Streams",
      "columns[6][searchable]": "true",
      "columns[6][orderable]": "true",
      "columns[6][search][value]": "500,000,000|19,523,049,096",
      "columns[6][search][regex]": "false",
      "columns[7][data]": "7",
      "columns[7][name]": "Daily",
      "columns[7][searchable]": "false",
      "columns[7][orderable]": "true",
      "columns[7][search][value]": "",
      "columns[7][search][regex]": "false",
      "columns[8][data]": "8",
      "columns[8][name]": "EAS",
      "columns[8][searchable]": "false",
      "columns[8][orderable]": "false",
      "columns[8][search][value]": "",
      "columns[8][search][regex]": "false",
      "columns[9][data]": "9",
      "columns[9][name]": "Genre",
      "columns[9][searchable]": "true",
      "columns[9][orderable]": "false",
      "columns[9][search][value]": "",
      "columns[9][search][regex]": "false",
      "columns[10][data]": "10",
      "columns[10][name]": "Language",
      "columns[10][searchable]": "true",
      "columns[10][orderable]": "false",
      "columns[10][search][value]": "",
      "columns[10][search][regex]": "false",
      "columns[11][data]": "11",
      "columns[11][name]": "Year",
      "columns[11][searchable]": "true",
      "columns[11][orderable]": "false",
      "columns[11][search][value]": "",
      "columns[11][search][regex]": "false",
      "order[0][column]": "0",
      "order[0][dir]": "asc",
      start: start.toString(),
      length: length.toString(),
      "search[value]": "",
      "search[regex]": "false",
      wdtNonce: "c43c821b3d",
      sRangeSeparator: "|"
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result && result.data && Array.isArray(result.data)) {
        console.log(`Fetched ${result.data.length} albums in this batch`);
        allAlbums = allAlbums.concat(result.data);
        
        // Check if we've reached the end
        if (result.data.length < length) {
          console.log('Reached end of data');
          break;
        }
      } else {
        console.log('Unexpected response structure:', result);
        break;
      }

    } catch (error) {
      console.error(`Error fetching albums starting from ${start}:`, error);
      // Continue with next batch on error
    }

    start += length;
    
    // Add a small delay to be respectful to the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`Total albums fetched: ${allAlbums.length}`);

  // Save raw data to file
  const outputPath = path.join(__dirname, "all-albums-data.json");
  fs.writeFileSync(outputPath, JSON.stringify(allAlbums, null, 2));
  console.log(`Raw album data saved to: ${outputPath}`);

  // Process and structure the data
  const processedAlbums = processAlbumData(allAlbums);
  
  // Save processed data to file (convert BigInt to string for JSON serialization)
  const processedOutputPath = path.join(__dirname, "processed-albums-data.json");
  const jsonData = JSON.stringify(processedAlbums, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }, 2);
  fs.writeFileSync(processedOutputPath, jsonData);
  console.log(`Processed album data saved to: ${processedOutputPath}`);

  return processedAlbums;
}

/**
 * Process raw album data into structured format for database insertion
 * @param {Array} rawData - Raw data from ChartMasters API
 * @returns {Array} Processed album data
 */
function processAlbumData(rawData) {
  console.log('Processing album data...');
  
  return rawData.map((album, index) => {
    try {
      // Extract data from each column
      // Based on the raw data structure:
      // [0] = empty, [1] = rank, [2] = cover_image, [3] = "Artist Album", [4] = gender, 
      // [5] = album_html_with_artist_link, [6] = streams, [7] = daily, [8] = eas, [9] = genre, [10] = language, [11] = year
      
      const rank = album[1] || '';
      const coverImage = extractImageUrl(album[2] || '');
      const artist = extractArtistName(album[5] || ''); // Extract from album HTML field
      const gender = cleanText(album[4] || '');
      const albumName = extractAlbumName(album[5] || ''); // Extract from album HTML field
      const streams = parseStreamCount(album[6] || '');
      const dailyStreams = parseStreamCount(album[7] || '');
      const genre = cleanText(album[9] || '');
      const language = cleanText(album[10] || '');
      const year = cleanYear(album[11] || '');

      return {
        rank: parseInt(rank) || index + 1,
        albName: albumName,
        artist: artist,
        thumbnail: coverImage,
        albType: gender, // Using gender field as album type (Solo/Group/etc)
        streamCount: streams,
        dailyStreamCount: dailyStreams,
        genre: genre,
        language: language,
        year: year
      };
    } catch (error) {
      console.error(`Error processing album at index ${index}:`, error);
      return null;
    }
  }).filter(album => album !== null && album.albName && album.artist);
}

/**
 * Extract image URL from HTML img tag
 * @param {string} htmlString - HTML string containing img tag
 * @returns {string} Image URL or empty string
 */
function extractImageUrl(htmlString) {
  if (!htmlString) return '';
  
  // Try both single and double quotes
  let match = htmlString.match(/src="([^"]+)"/);
  if (!match) {
    match = htmlString.match(/src='([^']+)'/);
  }
  
  return match ? match[1] : '';
}

/**
 * Extract artist name from HTML string containing album info
 * @param {string} htmlString - HTML string with album and artist info
 * @returns {string} Cleaned artist name
 */
function extractArtistName(htmlString) {
  if (!htmlString) return '';
  
  // Extract artist from the link at the bottom: <a href="...">Artist Name</a>
  const artistMatch = htmlString.match(/>([^<]+)<\/a>$/);
  if (artistMatch) {
    return cleanText(artistMatch[1]);
  }
  
  // Fallback: extract from field 3 which seems to be "Artist Album"
  const cleaned = cleanText(htmlString);
  const words = cleaned.split(' ');
  
  // Try to split on album name if we can identify it
  if (words.length >= 2) {
    // Take first part as artist name
    return words.slice(0, Math.ceil(words.length / 2)).join(' ');
  }
  
  return cleaned;
}

/**
 * Extract album name from HTML string
 * @param {string} htmlString - HTML string with album info
 * @returns {string} Cleaned album name
 */
function extractAlbumName(htmlString) {
  if (!htmlString) return '';
  
  // Extract album name from <b> tags: <i><b>Album Name</b></i>
  const albumMatch = htmlString.match(/<b>([^<]+)<\/b>/);
  if (albumMatch) {
    return cleanText(albumMatch[1]);
  }
  
  // Fallback to cleaned text
  return cleanText(htmlString);
}

/**
 * Clean year string and remove commas
 * @param {string} yearString - Year as string (e.g., "2,022")
 * @returns {string} Cleaned year
 */
function cleanYear(yearString) {
  if (!yearString) return '';
  return cleanText(yearString).replace(/,/g, '');
}

/**
 * Clean text by removing HTML tags and extra whitespace
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
function cleanText(text) {
  if (!text) return '';
  // Remove HTML tags and decode entities
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

/**
 * Parse stream count from string format
 * @param {string} streamString - Stream count as string (e.g., "1,234,567,890")
 * @returns {bigint} Stream count as bigint
 */
function parseStreamCount(streamString) {
  if (!streamString) return BigInt(0);
  
  // Remove commas and any non-digit characters except for the number itself
  const cleanedString = streamString.replace(/[^0-9]/g, '');
  
  if (!cleanedString) return BigInt(0);
  
  try {
    return BigInt(cleanedString);
  } catch (error) {
    console.error(`Error parsing stream count "${streamString}":`, error);
    return BigInt(0);
  }
}

// Run the script if called directly
if (require.main === module) {
  fetchChartmastersAlbumsData()
    .then((data) => {
      console.log(`Successfully fetched and processed ${data.length} albums`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error:", error);
      process.exit(1);
    });
}

module.exports = { fetchChartmastersAlbumsData, processAlbumData };