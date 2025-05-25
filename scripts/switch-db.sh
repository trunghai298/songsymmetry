#!/bin/bash

# SongSymmetry Database Switcher
# Usage: ./scripts/switch-db.sh [local|remote]

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

show_usage() {
    echo "Usage: $0 [local|remote|status]"
    echo ""
    echo "Commands:"
    echo "  local   - Switch to local PostgreSQL database"
    echo "  remote  - Switch to remote database"
    echo "  status  - Show current database configuration"
    echo ""
    echo "Examples:"
    echo "  $0 local    # Switch to local development database"
    echo "  $0 remote   # Switch to production/remote database"
    echo "  $0 status   # Check which database is currently configured"
}

get_current_db() {
    if [ -f .env ]; then
        local db_url=$(grep "DATABASE_URL=" .env | cut -d'=' -f2-)
        if [[ "$db_url" == *"localhost"* ]]; then
            echo "local"
        elif [[ "$db_url" == *"149.248.211.58"* ]]; then
            echo "remote"
        else
            echo "unknown"
        fi
    else
        echo "no-config"
    fi
}

show_status() {
    local current=$(get_current_db)
    echo "🎵 SongSymmetry Database Status"
    echo "=============================="
    
    case $current in
        "local")
            echo "✅ Currently using: LOCAL database"
            echo "   📍 Host: localhost:5432"
            echo "   🗄️  Database: songsymmetry_local"
            ;;
        "remote")
            echo "✅ Currently using: REMOTE database"
            echo "   📍 Host: 149.248.211.58:5432"
            echo "   🗄️  Database: songsymmetry"
            ;;
        "unknown")
            echo "⚠️  Currently using: UNKNOWN database configuration"
            ;;
        "no-config")
            echo "❌ No .env configuration found"
            ;;
    esac
    
    echo ""
    if [ -f .env.local ]; then
        echo "📁 Available configurations:"
        echo "   - .env.local (local development)"
        if [ -f .env.remote.backup ]; then
            echo "   - .env.remote.backup (remote/production)"
        fi
    fi
}

switch_to_local() {
    echo "🔄 Switching to LOCAL database..."
    
    if [ ! -f .env.local ]; then
        echo "❌ Error: .env.local not found"
        echo "   Please set up local database first"
        exit 1
    fi
    
    # Backup current config if it's not already backed up
    if [ -f .env ] && [ ! -f .env.remote.backup ]; then
        cp .env .env.remote.backup
        echo "💾 Backed up current config to .env.remote.backup"
    fi
    
    cp .env.local .env
    echo "✅ Switched to local database"
    echo "   📍 Host: localhost:5432"
    echo "   🗄️  Database: songsymmetry_local"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Restart your development server: npm run dev"
    echo "   2. Check status: curl http://localhost:3000/api/system/health"
    echo "   3. Import data: curl -X POST http://localhost:3000/api/system/setup"
}

switch_to_remote() {
    echo "🔄 Switching to REMOTE database..."
    
    if [ ! -f .env.remote.backup ]; then
        echo "❌ Error: .env.remote.backup not found"
        echo "   Cannot switch to remote database without backup"
        exit 1
    fi
    
    cp .env.remote.backup .env
    echo "✅ Switched to remote database"
    echo "   📍 Host: 149.248.211.58:5432"
    echo "   🗄️  Database: songsymmetry"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Restart your development server: npm run dev"
    echo "   2. Check status: curl http://localhost:3000/api/system/health"
}

# Main command handling
case "${1:-}" in
    "local")
        switch_to_local
        ;;
    "remote")
        switch_to_remote
        ;;
    "status")
        show_status
        ;;
    "-h"|"--help"|"help")
        show_usage
        ;;
    "")
        show_status
        echo ""
        show_usage
        ;;
    *)
        echo "❌ Error: Unknown command '$1'"
        echo ""
        show_usage
        exit 1
        ;;
esac