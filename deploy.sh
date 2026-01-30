#!/bin/bash

# Deploy Script untuk News Backend
# Script ini untuk deployment ke VPS menggunakan Docker

set -e

echo "================================"
echo "News Backend Deployment Script"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="news-backend"
BACKUP_DIR="./backups"
LOG_FILE="./deploy.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if .env exists
if [ ! -f .env ]; then
    error ".env file tidak ditemukan!"
    echo "Silakan copy .env.example ke .env dan sesuaikan konfigurasi"
    exit 1
fi

# Create necessary directories
log "Membuat direktori yang diperlukan..."
mkdir -p $BACKUP_DIR
mkdir -p uploads
mkdir -p logs

# Backup database sebelum deploy (jika sudah running)
if docker ps | grep -q news-mysql; then
    log "Membuat backup database sebelum deploy..."
    bash backup.sh
fi

# Stop existing containers
log "Menghentikan container yang sedang berjalan..."
docker-compose down || true

# Pull latest images
log "Pulling latest images..."
docker-compose pull

# Build and start containers
log "Building dan starting containers..."
docker-compose up -d --build

# Wait for services to be healthy
log "Menunggu services ready..."
sleep 10

# Check if services are running
if docker ps | grep -q $APP_NAME; then
    log "✓ Backend container running"
else
    error "✗ Backend container gagal start"
    exit 1
fi

if docker ps | grep -q news-mysql; then
    log "✓ MySQL container running"
else
    error "✗ MySQL container gagal start"
    exit 1
fi

# Show logs
log "Menampilkan logs (Ctrl+C untuk keluar)..."
docker-compose logs -f --tail=50

echo ""
log "================================"
log "Deployment selesai!"
log "================================"
log "Backend: http://localhost:3001"
log "Health check: http://localhost:3001/health"
log ""
log "Useful commands:"
log "  - View logs: docker-compose logs -f"
log "  - Stop: docker-compose down"
log "  - Restart: docker-compose restart"
log "  - Backup DB: bash backup.sh"
log "================================"
