#!/bin/bash

# Database Backup Script
# Membuat backup database MySQL

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${DATE}.sql"
LATEST_LINK="$BACKUP_DIR/latest.sql"

# Keep only last N backups
KEEP_BACKUPS=7

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directory
mkdir -p $BACKUP_DIR

log "Starting database backup..."
log "Database: $DB_NAME"
log "Backup file: $BACKUP_FILE"

# Check if running in Docker
if docker ps | grep -q news-mysql; then
    log "Using Docker MySQL container..."
    docker exec news-mysql mysqldump \
        -u${DB_USER} \
        -p${DB_PASSWORD} \
        ${DB_NAME} \
        --single-transaction \
        --quick \
        --lock-tables=false \
        --routines \
        --triggers \
        --events \
        > "$BACKUP_FILE"
else
    log "Using local MySQL..."
    mysqldump \
        -h${DB_HOST} \
        -P${DB_PORT} \
        -u${DB_USER} \
        -p${DB_PASSWORD} \
        ${DB_NAME} \
        --single-transaction \
        --quick \
        --lock-tables=false \
        --routines \
        --triggers \
        --events \
        > "$BACKUP_FILE"
fi

# Compress backup
log "Compressing backup..."
gzip -f "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Create symlink to latest backup
ln -sf "$(basename $BACKUP_FILE)" "$LATEST_LINK.gz"

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

log "✓ Backup completed successfully!"
log "File: $BACKUP_FILE"
log "Size: $BACKUP_SIZE"

# Cleanup old backups
log "Cleaning up old backups (keeping last $KEEP_BACKUPS)..."
cd $BACKUP_DIR
ls -t backup_*.sql.gz 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -f
REMAINING=$(ls -1 backup_*.sql.gz 2>/dev/null | wc -l)
log "Backups remaining: $REMAINING"

log "================================"
log "Backup selesai!"
log "================================"

# List recent backups
echo ""
log "Recent backups:"
ls -lht $BACKUP_DIR/backup_*.sql.gz 2>/dev/null | head -5 || echo "No backups found"
