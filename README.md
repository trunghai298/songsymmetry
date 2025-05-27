# 🎵 SongSymmetry

[![CI/CD Pipeline](https://github.com/trunghai298/songsymmetry/actions/workflows/ci-cd.yml/badge.svg?branch=dev&event=deployment_status)](https://github.com/trunghai298/songsymmetry/actions/workflows/ci-cd.yml)

**SongSymmetry** is a comprehensive music discovery and social platform that combines streaming data analytics, collaborative listening, and interactive gaming features. Built with Next.js and powered by real streaming data from ChartMasters and Spotify's rich metadata.

## 🚀 Features

### 🎯 Core Features

#### **Music Exploration & Discovery**
- **📊 Most Streamed Songs**: Interactive charts with 50M+ streaming data from ChartMasters
- **💿 Album Discovery**: Curated collections with advanced filtering by year, genre, language, and artist
- **🎨 Dynamic Backgrounds**: Immersive album artwork experiences that transform the interface
- **🔍 Smart Search**: Advanced filtering and search options for personalized music discovery

#### **🎪 Collaborative Music Stations**
- **🎵 Real-time Listening Rooms**: Create and join collaborative playlists with friends
- **💬 Live Chat**: Real-time messaging within stations with typing indicators and emoji support
- **⏯️ Synchronized Playback**: Shared music experiences with synchronized play/pause controls
- **🎛️ System Stations**: Curated themed stations including:
  - All-Time Legends
  - K-Pop Hits 
  - US/UK Chart Toppers
  - Discovery Mix
- **➕ Track Management**: Add/remove songs with live updates across all connected users

#### **🎮 Daily Song Guessing Game**
- **🎯 Wordle-style Gameplay**: Guess the daily song with progressive visual feedback
- **🔢 Multi-attribute Matching**: Compare song name, artist, album, genre, year, popularity, duration, and explicit content
- **✨ Progressive Revelation**: Animated column-by-column feedback system with smooth transitions
- **🏆 Competitive Elements**: Personal statistics, attempt tracking, and completion leaderboards
- **📱 Mobile Optimization**: Responsive design with condensed mobile view for on-the-go gaming

#### **🎧 Spotify Integration**
- **🔐 OAuth Authentication**: Secure Spotify account linking with token management
- **📝 Playlist Management**: Import, export, and sync personal playlists
- **🎵 Playbook Control**: Direct Spotify player integration with playback controls
- **🔍 Search & Recommendations**: Powered by Spotify's comprehensive music catalog
- **🔄 Auto-refresh**: Automatic token refresh with graceful error handling

#### **⚙️ Data Analytics & Background Processing**
- **📈 Automated Data Updates**: Scheduled imports from ChartMasters using Redis job queues
- **🔄 Background Processing**: Integrated job processing within the main application
- **🔗 Spotify ID Enrichment**: Automatic mapping of streaming data to Spotify tracks
- **📊 Performance Monitoring**: Health checks and comprehensive system status endpoints

## 🏗️ Technology Stack

### **Frontend**
- **⚛️ Next.js 14** with App Router and TypeScript
- **🎨 Tailwind CSS** + **DaisyUI** for responsive, mobile-first design
- **🧩 Radix UI** components for accessibility and user experience
- **🗃️ Redux Toolkit** for global state management
- **🔌 Socket.IO** for real-time features and live collaboration

### **Backend**
- **🚀 Next.js API Routes** with custom Express server for WebSocket support
- **🐘 PostgreSQL** database with **Prisma** ORM for type-safe database operations
- **🔐 NextAuth.js** with Spotify OAuth integration
- **🔴 Redis** with **Bull** queues for reliable background job processing
- **🔌 Socket.IO** server for real-time station collaboration

### **Third-party Integrations**
- **🎵 Spotify Web API** for music data, search, and playback control
- **📊 ChartMasters.org** for comprehensive streaming statistics and chart data
- **🎤 Genius API** for lyrics integration (planned feature)

### **Deployment & Infrastructure**
- **✈️ Fly.io** for production hosting with geographic distribution
- **☁️ Vercel** support with optimized standalone builds
- **🐳 Docker** containerization with separate worker processes
- **🔄 GitHub Actions** for CI/CD pipeline automation

## 🗃️ Database Schema

### **Core Models**
- **🎵 MostStreamedSongs**: 50M+ songs with streaming statistics and metadata
- **💿 MostStreamedAlbums**: Album charts with comprehensive filtering capabilities
- **🎪 Station/StationMember/StationTrack**: Collaborative listening infrastructure
- **👤 User**: Spotify-linked profiles with session and preference management
- **🎮 DailySongGame/DailySongGameAttempt**: Gaming system with attempt tracking and statistics

### **Key Features**
- Optimized indexing for fast queries across large datasets
- BigInt support for handling large stream counts (50M+)
- Comprehensive metadata including year, genre, language, and regional data
- Real-time state tracking for active sessions and live collaboration

## 🚀 Getting Started

### **Prerequisites**

- **Node.js** 18+ and npm
- **PostgreSQL** 14+ for database
- **Redis** for job queues and caching
- **Spotify Developer Account** for API access

### **Environment Setup**

1. **Clone the repository:**
   ```bash
   git clone https://github.com/trunghai298/songsymmetry.git
   cd songsymmetry
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file:
   ```env
   # Spotify API credentials
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/songsymmetry_local
   
   # Redis
   REDIS_URL=redis://127.0.0.1:6379
   
   # NextAuth
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Set up Spotify App:**
   - Create an app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Add `http://localhost:3000/api/auth/callback/spotify` to redirect URIs
   - Copy Client ID and Secret to your `.env` file

### **Database Setup**

#### **Option 1: Local Development Database (Recommended)**

1. **Install and start PostgreSQL:**
   ```bash
   brew install postgresql@14
   brew services start postgresql@14
   ```

2. **Create local database:**
   ```bash
   # Create user and database
   psql postgres -c "CREATE USER songsymmetry_user WITH PASSWORD 'songsymmetry_local_pass';"
   psql postgres -c "CREATE DATABASE songsymmetry_local;"
   psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE songsymmetry_local TO songsymmetry_user;"
   ```

3. **Initialize database schema:**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

#### **Option 2: Use Remote Database**
   ```bash
   # Switch to remote database configuration
   ./scripts/switch-db.sh remote
   ```

### **Redis Setup**

1. **Install and start Redis:**
   ```bash
   brew install redis
   brew services start redis
   ```

2. **Test Redis connection:**
   ```bash
   redis-cli ping  # Should return "PONG"
   npm run redis:test:api
   ```

### **Initial Data Import**

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Import initial data:**
   ```bash
   # Import songs, albums, and system stations
   curl -X POST http://localhost:3000/api/system/setup \
     -H "Content-Type: application/json" \
     -d '{"songs": true, "albums": true, "stations": true}'
   ```

3. **Verify system health:**
   ```bash
   npm run db:health
   ```

## 🔧 Development

### **Available Scripts**

#### **Development**
```bash
npm run dev              # Start development server with WebSocket support
npm run dev:next         # Start Next.js development server only
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

#### **Database Management**
```bash
# Database switching
npm run db:switch:local   # Switch to local development database
npm run db:switch:remote  # Switch to remote/production database
npm run db:status         # Check current database configuration

# Prisma operations
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Deploy migrations to production
npm run prisma:migrate:dev # Create and apply migrations in development
npm run prisma:studio     # Open Prisma Studio database browser

# System management
npm run db:setup          # Import initial data (songs, albums, stations)
npm run db:health         # Check system health and connectivity
```

#### **Data Operations**
```bash
# ChartMasters data import
npm run fetch:songs       # Fetch latest song data from ChartMasters
npm run import:songs      # Import fetched data to database
npm run import:songs:dry  # Preview import without making changes
npm run update:songs      # Update existing song data with latest information

# Multi-year imports
npm run import:multi-year      # Import multiple years of data
npm run import:multi-year:dry  # Preview multi-year import
npm run import:multi-year:cached # Use cached data for faster import

# Automated imports
npm run auto:import           # Run automated import process
npm run auto:import:install   # Install weekly auto-import (macOS only)
npm run auto:import:uninstall # Remove weekly auto-import
```

#### **Background Jobs & Redis**
```bash
# Worker management
npm run worker:start              # Start background worker process
npm run worker:schedule:weekly    # Schedule weekly data updates
npm run worker:update:all         # Trigger full database update
npm run worker:update:year        # Update specific year data

# Redis testing
npm run redis:test               # Test Redis connectivity
npm run redis:test:api           # Test Redis via API endpoint
```

#### **Docker Support**
```bash
npm run docker:build    # Build Docker containers
npm run docker:up       # Start services with Docker Compose
npm run docker:down     # Stop Docker services
npm run docker:logs     # View Docker container logs
```

### **Development Workflow**

1. **Daily Development:**
   ```bash
   # Ensure local database is active
   npm run db:switch:local
   
   # Start development server
   npm run dev
   
   # Your changes only affect the local database
   ```

2. **Schema Changes:**
   ```bash
   # Work on local database
   npm run db:switch:local
   
   # Modify prisma/schema.prisma
   # Apply changes locally
   npx prisma db push
   
   # Test thoroughly, then create migration
   npx prisma migrate dev --name describe_your_change
   
   # Commit schema and migration files
   git add prisma/
   git commit -m "feat(db): add new feature table"
   ```

3. **Deploying Changes:**
   ```bash
   # Test locally first
   npm run db:switch:local
   npm run dev
   
   # Apply to remote (automatic on deployment)
   git push origin dev
   ```

### **API Documentation**

#### **System Endpoints**
- `GET /api/system/health` - System health check and database connectivity
- `GET /api/system/status` - Detailed system status including data counts
- `POST /api/system/setup` - Initialize system with base data

#### **Music Data**
- `GET /api/songs/filter-options` - Available filter options for songs
- `GET /api/albums/spotify-stats` - Album statistics and metadata
- `POST /api/songs/update-spotify-data` - Update song Spotify information

#### **Stations & Real-time**
- `GET /api/stations` - List all available stations
- `GET /api/stations/[id]` - Get specific station details
- `POST /api/stations/[id]/tracks` - Add track to station
- `GET /api/stations/[id]/members` - Get station members
- `WebSocket /api/socket` - Real-time station updates

#### **Daily Song Game**
- `GET /api/daily-song-game` - Get today's game state and user attempts
- `POST /api/daily-song-game` - Submit a song guess
- `GET /api/daily-song-game/stats` - Game statistics and leaderboards

#### **Spotify Integration**
- `GET /api/spotify/search` - Search Spotify catalog
- `GET /api/spotify/track/[id]` - Get track details
- `GET /api/spotify/playlist/[id]` - Get playlist information

#### **Background Jobs**
- `GET /api/song-updates` - Check job system status
- `POST /api/song-updates` - Schedule data update jobs
- `GET /api/redis-test` - Test Redis connectivity

## 🔒 Authentication & Security

### **Spotify OAuth Flow**
1. User clicks "Sign in with Spotify"
2. Redirected to Spotify authorization
3. User grants permissions
4. Redirected back with authorization code
5. Server exchanges code for access/refresh tokens
6. User session created with Spotify profile

### **Session Management**
- **NextAuth.js** handles secure session management
- **JWT tokens** for stateless authentication
- **Automatic token refresh** for Spotify API calls
- **Secure cookies** with httpOnly and sameSite settings

### **Data Protection**
- **Environment variables** for sensitive configuration
- **Prisma** for SQL injection prevention
- **Rate limiting** on API endpoints
- **Input validation** and sanitization

## 🚢 Deployment

### **Fly.io Deployment (Production)**

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Deploy application:**
   ```bash
   fly deploy
   ```

3. **Set environment variables:**
   ```bash
   fly secrets set SPOTIFY_CLIENT_ID=your_client_id
   fly secrets set SPOTIFY_CLIENT_SECRET=your_client_secret
   fly secrets set DATABASE_URL=your_database_url
   fly secrets set REDIS_URL=your_redis_url
   ```

### **Vercel Deployment**

1. **Connect repository to Vercel**
2. **Configure environment variables in Vercel dashboard**
3. **Deploy automatically on push to main branch**

### **Docker Deployment**

```bash
# Build and run with Docker Compose
npm run docker:build
npm run docker:up

# Or build standalone
docker build -t songsymmetry .
docker run -p 3000:3000 songsymmetry
```

## 📊 Monitoring & Health Checks

### **System Health**
```bash
# Check overall system health
curl http://localhost:3000/api/system/health

# Get detailed system status
curl http://localhost:3000/api/system/status

# Test Redis connectivity
curl http://localhost:3000/api/redis-test
```

### **Database Monitoring**
```bash
# View database in browser
npx prisma studio

# Check database connectivity
npx prisma db pull

# Monitor query performance
# Access PostgreSQL logs and slow query monitoring
```

### **Performance Monitoring**
- **Real-time WebSocket monitoring** for station activities
- **Job queue monitoring** for background task processing
- **API response time tracking** for endpoint performance
- **Database query optimization** with Prisma query analysis

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following the development workflow
4. **Test thoroughly** on local database
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### **Development Guidelines**
- **Follow TypeScript best practices** with strict type checking
- **Use Prettier and ESLint** for consistent code formatting
- **Write descriptive commit messages** following conventional commits
- **Test on local database** before submitting PRs
- **Update documentation** for new features or API changes

## 📚 Additional Documentation

- **[Development Workflow](./DEVELOPMENT_WORKFLOW.md)** - Detailed development processes and database management
- **[Local Database Setup](./LOCAL_DB_SETUP.md)** - Complete local PostgreSQL and Redis setup guide
- **[Redis Integration](./REDIS.md)** - Background job processing and queue management
- **[Prisma Documentation](./README-PRISMA.md)** - Database schema and migration guide

## 🐛 Troubleshooting

### **Common Issues**

1. **Database Connection Errors:**
   ```bash
   # Check database status
   npm run db:status
   
   # Reset local database
   npx prisma db push --force-reset
   npm run db:setup
   ```

2. **Redis Connection Issues:**
   ```bash
   # Check Redis service
   brew services list | grep redis
   
   # Test Redis connectivity
   redis-cli ping
   npm run redis:test
   ```

3. **Spotify API Errors:**
   - Verify Client ID and Secret in `.env`
   - Check redirect URIs in Spotify app settings
   - Ensure scopes are properly configured

4. **Build/Deployment Issues:**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   
   # Regenerate Prisma client
   npx prisma generate
   ```

### **Getting Help**
- **Check existing issues** in the GitHub repository
- **Review logs** for specific error messages
- **Test API endpoints** with curl or Postman
- **Use Prisma Studio** to inspect database state

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[ChartMasters.org](https://chartmasters.org)** for providing comprehensive streaming data
- **[Spotify Web API](https://developer.spotify.com/documentation/web-api/)** for music metadata and playback
- **[Next.js](https://nextjs.org/)** team for the excellent React framework
- **[Prisma](https://www.prisma.io/)** for type-safe database access
- **[Tailwind CSS](https://tailwindcss.com/)** for utility-first styling

---

**Built with ❤️ for music lovers and data enthusiasts**

*Discover, collaborate, and play with music like never before* 🎵