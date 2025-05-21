// Use built-in fetch API for Node.js versions 18+
// No need for external package
const fs = require('fs');
const path = require('path');

/**
 * Script to fetch data from chartmasters.org and save to a JSON file
 * This gets the most streamed songs data from their data table
 * @param {Object} options - Options for fetching data
 * @param {string} options.year - Year to filter songs by (e.g., "2024", "2023")
 * @param {number} options.limit - Maximum number of songs to fetch (default: 10000)
 */
async function fetchChartmastersData(options = { year: "2024", limit: 10000 }) {
  const url = 'https://chartmasters.org/wp-admin/admin-ajax.php?action=get_wdtable&table_id=46';
  
  // Request headers to mimic a browser request
  const headers = {
    'User-Agent': 'Thunder Client (https://www.thunderclient.com)',
    'Accept': '*/*',
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  
  // The POST body parameters - pre-encoding them manually
  const params = new URLSearchParams({
    'draw': '3',
    'columns[0][data]': '0',
    'columns[0][name]': 'rank',
    'columns[0][searchable]': 'false',
    'columns[0][orderable]': 'true',
    'columns[0][search][value]': '',
    'columns[0][search][regex]': 'false',
    'columns[1][data]': '1',
    'columns[1][name]': 'g#',
    'columns[1][searchable]': 'false',
    'columns[1][orderable]': 'true',
    'columns[1][search][value]': '',
    'columns[1][search][regex]': 'false',
    'columns[2][data]': '2',
    'columns[2][name]': 'Title',
    'columns[2][searchable]': 'true',
    'columns[2][orderable]': 'true',
    'columns[2][search][value]': '',
    'columns[2][search][regex]': 'false',
    'columns[3][data]': '3',
    'columns[3][name]': 'Artist',
    'columns[3][searchable]': 'true',
    'columns[3][orderable]': 'true',
    'columns[3][search][value]': '',
    'columns[3][search][regex]': 'false',
    'columns[4][data]': '4',
    'columns[4][name]': 'image_url',
    'columns[4][searchable]': 'false',
    'columns[4][orderable]': 'true',
    'columns[4][search][value]': '',
    'columns[4][search][regex]': 'false',
    'columns[5][data]': '5',
    'columns[5][name]': 'Song',
    'columns[5][searchable]': 'false',
    'columns[5][orderable]': 'true',
    'columns[5][search][value]': '',
    'columns[5][search][regex]': 'false',
    'columns[6][data]': '6',
    'columns[6][name]': 'playcount',
    'columns[6][searchable]': 'false',
    'columns[6][orderable]': 'true',
    'columns[6][search][value]': '',
    'columns[6][search][regex]': 'false',
    'columns[7][data]': '7',
    'columns[7][name]': 'dailyStreams',
    'columns[7][searchable]': 'false',
    'columns[7][orderable]': 'true',
    'columns[7][search][value]': '',
    'columns[7][search][regex]': 'false',
    'columns[8][data]': '8',
    'columns[8][name]': 'year',
    'columns[8][searchable]': 'true',
    'columns[8][orderable]': 'true',
    'columns[8][search][value]': options.year || '2024',
    'columns[8][search][regex]': 'true',
    'columns[9][data]': '9',
    'columns[9][name]': 'genre',
    'columns[9][searchable]': 'true',
    'columns[9][orderable]': 'true',
    'columns[9][search][value]': '',
    'columns[9][search][regex]': 'false',
    'columns[10][data]': '10',
    'columns[10][name]': 'language',
    'columns[10][searchable]': 'true',
    'columns[10][orderable]': 'true',
    'columns[10][search][value]': '',
    'columns[10][search][regex]': 'false',
    'order[0][column]': '6',
    'order[0][dir]': 'desc',
    'start': '0',
    'length': options.limit?.toString() || '10000',
    'search[value]': '',
    'search[regex]': 'false',
    'wdtNonce': 'c4780e8d1d',
    'sRangeSeparator': '|'
  });
  
  try {
    console.log(`Fetching data from chartmasters.org for year ${options.year || '2024'}...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: params.toString()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Successfully fetched ${data.data.length} songs.`);
    
    // Log raw data first to check structure
    console.log("Raw data example (first item):", data.data[0]);
    
    // Process the data to a cleaner format
    const processedData = data.data.map(item => {
      // Extract the numeric part from the playcount string
      const playCountStr = item[6];
      const playcountMatch = playCountStr.match(/[\d,]+/);
      const playcount = playcountMatch ? parseInt(playcountMatch[0].replace(/,/g, ''), 10) : 0;
      
      // Extract image URL from HTML
      const imageHTML = item[4];
      const imageMatch = imageHTML.match(/src="([^"]+)"/);
      const imageUrl = imageMatch ? imageMatch[1] : '';
      
      return {
        rank: parseInt(item[0], 10),
        title: item[2],
        artist: item[3],
        imageUrl: imageUrl,
        streamCount: playcount,
        dailyStreamCount: parseInt(item[7].replace(/,/g, ''), 10),
        year: item[8],
        genre: item[9],
        language: item[10]
      };
    });
    
    // Log a few processed items to check format
    console.log("Processed data example (first 3 items):");
    console.log(JSON.stringify(processedData.slice(0, 3), null, 2));
    
    // Save the processed data to a JSON file with year in the filename
    const year = options.year || '2024';
    const outputPath = path.join(__dirname, `chartmasters-data-${year}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(processedData, null, 2));
    console.log(`Data saved to ${outputPath}`);
    
    return processedData;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

// Function to parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = { year: '2024', limit: 10000 };
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--year' && i + 1 < args.length) {
      options.year = args[i + 1];
      i++; // Skip the next argument as it's the value
    } else if (args[i] === '--limit' && i + 1 < args.length) {
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
  
  console.log(`Starting fetch with options: year=${options.year}, limit=${options.limit}`);
  
  fetchChartmastersData(options)
    .then(data => {
      console.log(`Finished processing ${data.length} songs for year ${options.year}`);
    })
    .catch(err => {
      console.error('Script failed:', err);
      process.exit(1);
    });
}

// Export the function for use in other scripts
module.exports = { fetchChartmastersData };