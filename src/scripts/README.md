# Song Data Import Scripts

These scripts allow you to fetch and import song data from chartmasters.org into your database.

## Available Scripts

### Fetch Songs

Fetches song data from chartmasters.org and saves it to a JSON file.

```bash
# Default fetch (year 2024)
npm run fetch:songs

# Fetch with specific year
npm run fetch:songs -- --year 2023

# Fetch with specific year and limit
npm run fetch:songs -- --year 2022 --limit 5000
```

### Import Songs

Imports song data into the database. Can use cached data files or fetch fresh data.

```bash
# Default import (year 2024)
npm run import:songs

# Dry run (no database changes)
npm run import:songs:dry

# Import with specific year
npm run import:songs -- --year 2023

# Import with specific year, using cached data, dry run
npm run import:songs -- --year 2022 --cached --dry-run
```

### Update Songs

Combines fetch and import to update song data in the database.

```bash
# Default update (year 2024)
npm run update:songs

# Dry run (no database changes)
npm run update:songs:dry

# Update with specific year
npm run update:songs -- --year 2023

# Update with specific year, using cached data
npm run update:songs -- --year 2022 --cached
```

## Examples

To import data for multiple years:

```bash
# Fetch and import data for 2022-2024
npm run update:songs -- --year 2024
npm run update:songs -- --year 2023
npm run update:songs -- --year 2022
```

## Database Schema

The data is imported into the `MostStreamedSongs` table with the following fields:

- `id` - Auto-incremented primary key
- `name` - Song title
- `artist` - Artist name
- `thumbnail` - URL to song/album artwork
- `streamCount` - Total stream count (BigInt)
- `dailyStreamCount` - Daily stream count (BigInt)
- `year` - Year of release/chart
- `genre` - Music genre
- `language` - Song language