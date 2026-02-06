#!/bin/bash

# Quick Start Script
# Script untuk recovery cepat jika server crash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "================================"
echo "Quick Start - Emergency Recovery"
echo "================================"
echo ""

# Check .env
if [ ! -f .env ]; then
    error ".env file tidak ditemukan!"
    echo "Copy dari backup atau buat baru"
    exit 1
fi

log "Checking Docker..."
if ! command -v docker &> /dev/null; then
    error "Docker tidak terinstall!"
    exit 1
fi

log "Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose tidak terinstall!"
    exit 1
fi

# Option 1: Docker
echo ""
echo "Pilih metode start:"
echo "1) Docker (Recommended)"
echo "2) PM2 (Alternative)"
echo "3) Node.js langsung (Quick test)"
read -p "Pilih (1/2/3): " METHOD

case $METHOD in
    1)
        log "Starting dengan Docker..."

        # Stop existing containers
        log "Stopping existing containers..."
        docker-compose down || true

        # Start containers
        log "Starting containers..."
        docker-compose up -d

        # Wait for services
        log "Waiting for services to be ready..."
        sleep 10

        # Check status
        if docker ps | grep -q news-backend; then
            log "✓ Backend container running"
        else
            error "Backend container gagal start!"
            docker-compose logs backend
            exit 1
        fi

        if docker ps | grep -q news-mysql; then
            log "✓ MySQL container running"
        else
            error "MySQL container gagal start!"
            docker-compose logs mysql
            exit 1
        fi

        log "✓ All containers running!"
        log "View logs: docker-compose logs -f"
        ;;

    2)
        log "Starting dengan PM2..."

        # Check PM2
        if ! command -v pm2 &> /dev/null; then
            error "PM2 tidak terinstall!"
            echo "Install dengan: npm install -g pm2"
            exit 1
        fi

        # Check node_modules
        if [ ! -d node_modules ]; then
            log "Installing dependencies..."
            npm install
        fi

        # Stop existing PM2 processes
        log "Stopping existing PM2 processes..."
        pm2 delete news-backend || true

        # Start with PM2
        log "Starting dengan PM2..."
        pm2 start ecosystem.config.js --env production

        # Save PM2 configuration
        pm2 save

        log "✓ Started with PM2!"
        log "View logs: pm2 logs news-backend"
        log "Monitor: pm2 monit"
        ;;

    3)
        log "Starting dengan Node.js langsung..."

        # Check node_modules
        if [ ! -d node_modules ]; then
            log "Installing dependencies..."
            npm install
        fi

        warning "Ini hanya untuk testing! Gunakan Docker atau PM2 untuk production."
        log "Starting server..."
        node app.js
        ;;

    *)
        error "Pilihan tidak valid"
        exit 1
        ;;
esac

echo ""
log "================================"
log "Quick Start Completed!"
log "================================"
log "Backend URL: http://localhost:3001"
log "Health check: http://localhost:3001/health"
log ""
log "Useful commands:"
if [ "$METHOD" = "1" ]; then
    log "  - Logs: docker-compose logs -f"
    log "  - Restart: docker-compose restart"
    log "  - Stop: docker-compose down"
elif [ "$METHOD" = "2" ]; then
    log "  - Logs: pm2 logs news-backend"
    log "  - Restart: pm2 restart news-backend"
    log "  - Stop: pm2 stop news-backend"
    log "  - Monitor: pm2 monit"
fi
log "  - Backup DB: bash backup.sh"
log "  - Restore DB: bash restore.sh latest"
log "================================"
