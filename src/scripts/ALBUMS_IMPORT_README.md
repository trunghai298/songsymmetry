# Albums Import Scripts

This directory contains scripts to fetch and import most streamed albums data from ChartMasters.org into the `MostStreamedAlbums` database table.

## Scripts Overview

### 1. `fetch-chartmasters-albums.js`
- Fetches all album data from ChartMasters API (table_id=7)
- Handles pagination to get all ~7,147 albums
- Processes and cleans the raw data
- Extracts album names, artists, thumbnails, stream counts, etc.
- Saves both raw and processed data to JSON files

### 2. `import-albums-data.js`
- Imports processed album data into the `MostStreamedAlbums` database table
- Handles BigInt conversion for large stream counts
- Imports data in batches for better performance
- Provides statistics and top albums after import

### 3. `run-albums-import.js`
- Combined script that runs both fetch and import operations
- **This is the main script to use for a complete import**

## Usage

### Complete Import (Recommended)
```bash
node src/scripts/run-albums-import.js
```

### Individual Steps
```bash
# 1. Fetch data only
node src/scripts/fetch-chartmasters-albums.js

# 2. Import data only (requires processed-albums-data.json)
node src/scripts/import-albums-data.js
```

## Data Structure

The imported albums include:
- **albName**: Album name (e.g., "Un Verano Sin Ti")
- **artist**: Artist name (e.g., "Bad Bunny")
- **thumbnail**: Spotify album cover URL
- **albType**: Album type (e.g., "Solo - Male", "Group", etc.)
- **streamCount**: Total streams as BigInt
- **dailyStreamCount**: Daily streams as BigInt
- **genre**: Music genre (e.g., "Reggaeton", "Pop")
- **language**: Language (e.g., "Spanish", "English")
- **year**: Release year (e.g., "2022")

## Output Files

- `all-albums-data.json`: Raw data from ChartMasters API
- `processed-albums-data.json`: Cleaned and structured data ready for database import

## Database Schema

The data is imported into the `MostStreamedAlbums` table:

```sql
model MostStreamedAlbums {
  id               Int       @id @default(autoincrement())
  albName          String?
  artist           String?
  thumbnail        String?
  albType          String?
  streamCount      BigInt?
  dailyStreamCount BigInt?
  year             String?
  genre            String?
  language         String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}
```

## Performance Notes

- The fetch process takes about 1-2 minutes (includes delays to be respectful to the API)
- Import process handles ~4,000 albums in batches of 100
- Total process time: ~3-5 minutes depending on network speed

## Troubleshooting

### Common Issues

1. **Network timeouts**: Restart the script - it will continue from where it left off
2. **Database connection issues**: Check your `DATABASE_URL` environment variable
3. **BigInt serialization errors**: The script handles this automatically now

### Data Validation

After import, the script shows:
- Total albums imported
- Top 10 most streamed albums
- Any processing errors

## API Source

Data is fetched from: https://chartmasters.org/streaming-albums-chart/
API endpoint: `https://chartmasters.org/wp-admin/admin-ajax.php?action=get_wdtable&table_id=7`

The API returns paginated data with 100 albums per request. The script automatically handles pagination until all albums are fetched.