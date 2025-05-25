# Local PostgreSQL Database Setup for SongSymmetry

## 🎯 Overview

This guide helps you set up a local PostgreSQL database for SongSymmetry development instead of using the remote database.

## ✅ Setup Complete

The local database has been successfully configured:

- **Database Name:** `songsymmetry_local`
- **User:** `songsymmetry_user`
- **Password:** `songsymmetry_local_pass`
- **Host:** `localhost`
- **Port:** `5432`

## 📁 Environment Files

### `.env` (Current - Local DB)
```env
SPOTIFY_CLIENT_ID=b105c7fc2f5045deaf2bda3393ab5110
SPOTIFY_CLIENT_SECRET=01b56119bec34d019484f695c77b0f0a
DATABASE_URL=postgresql://songsymmetry_user:songsymmetry_local_pass@localhost:5432/songsymmetry_local
```

### `.env.remote.backup` (Remote DB Backup)
Contains the original remote database configuration for when you need to connect back to the production database.

### `.env.local` (Local Development)
Contains local development configuration with additional PostgreSQL environment variables.

## 🔄 Switching Between Databases

### Use Local Database
```bash
cp .env.local .env
# or manually update DATABASE_URL in .env
```

### Use Remote Database
```bash
cp .env.remote.backup .env
```

## 🚀 Getting Started with Local DB

### 1. Verify Database Connection
```bash
npx prisma db pull
npx prisma generate
```

### 2. Import Data (Optional)
The local database is empty. To populate it with data:

```bash
# Check system health
curl http://localhost:3000/api/system/health

# Import all data
curl -X POST http://localhost:3000/api/system/setup \
  -H "Content-Type: application/json" \
  -d '{"songs": true, "albums": true, "stations": true}'
```

### 3. Manual Database Operations
```bash
# Connect to local database
psql postgresql://songsymmetry_user:songsymmetry_local_pass@localhost:5432/songsymmetry_local

# List tables
\dt

# Check record counts
SELECT 
  'songs' as table_name, COUNT(*) as count FROM "MostStreamedSongs"
UNION ALL
SELECT 
  'albums' as table_name, COUNT(*) as count FROM "MostStreamedAlbums"
UNION ALL
SELECT 
  'stations' as table_name, COUNT(*) as count FROM "Station";
```

## 🛠 Useful Commands

### PostgreSQL Service Management
```bash
# Start PostgreSQL
brew services start postgresql@14

# Stop PostgreSQL
brew services stop postgresql@14

# Restart PostgreSQL
brew services restart postgresql@14

# Check status
brew services list | grep postgresql
```

### Database Management
```bash
# Create new database
createdb -U songsymmetry_user new_database_name

# Drop database
dropdb -U songsymmetry_user database_name

# Backup database
pg_dump postgresql://songsymmetry_user:songsymmetry_local_pass@localhost:5432/songsymmetry_local > backup.sql

# Restore database
psql postgresql://songsymmetry_user:songsymmetry_local_pass@localhost:5432/songsymmetry_local < backup.sql
```

### Prisma Operations
```bash
# Reset database (clear all data)
npx prisma db push --force-reset

# View database in Prisma Studio
npx prisma studio

# Generate Prisma client
npx prisma generate

# Deploy schema changes
npx prisma db push
```

## 🔧 Troubleshooting

### Connection Issues
1. Ensure PostgreSQL is running: `brew services list | grep postgresql`
2. Check credentials match in `.env` file
3. Verify database exists: `psql postgres -c "\l" | grep songsymmetry`

### Permission Issues
```bash
# Grant permissions to user
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE songsymmetry_local TO songsymmetry_user;"
```

### Reset Everything
```bash
# Drop and recreate database
psql postgres -c "DROP DATABASE IF EXISTS songsymmetry_local;"
psql postgres -c "CREATE DATABASE songsymmetry_local;"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE songsymmetry_local TO songsymmetry_user;"

# Recreate schema
npx prisma db push
```

## 📊 Development Workflow

1. **Start Development:**
   ```bash
   # Ensure local DB is configured
   cp .env.local .env
   
   # Start development server
   npm run dev
   ```

2. **Work with Data:**
   ```bash
   # Import fresh data
   curl -X POST http://localhost:3000/api/system/setup
   
   # Check system status
   curl http://localhost:3000/api/system/status
   ```

3. **Switch to Production Testing:**
   ```bash
   # Switch to remote DB
   cp .env.remote.backup .env
   
   # Restart development server
   npm run dev
   ```

## 🎉 Benefits of Local Development

- **Faster development** - No network latency
- **Safe experimentation** - Won't affect production data
- **Offline development** - Work without internet
- **Full control** - Reset, backup, restore as needed
- **Testing migrations** - Test schema changes safely

Your local SongSymmetry database is now ready for development! 🚀