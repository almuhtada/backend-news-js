#!/bin/bash

# Database Restore Script
# Restore database dari backup

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    error "Backup directory tidak ditemukan: $BACKUP_DIR"
    exit 1
fi

# List available backups
echo "================================"
echo "Available Backups:"
echo "================================"
ls -lht $BACKUP_DIR/backup_*.sql.gz 2>/dev/null | nl || {
    error "Tidak ada backup ditemukan!"
    exit 1
}
echo ""

# Select backup file
if [ -z "$1" ]; then
    echo "Usage: bash restore.sh [backup_file]"
    echo "Or: bash restore.sh latest  (untuk restore backup terakhir)"
    echo ""
    read -p "Masukkan nama file backup atau 'latest': " BACKUP_INPUT
else
    BACKUP_INPUT="$1"
fi

# Determine backup file
if [ "$BACKUP_INPUT" = "latest" ]; then
    BACKUP_FILE="$BACKUP_DIR/latest.sql.gz"
    if [ ! -f "$BACKUP_FILE" ]; then
        # Find latest backup
        BACKUP_FILE=$(ls -t $BACKUP_DIR/backup_*.sql.gz 2>/dev/null | head -1)
    fi
else
    if [ -f "$BACKUP_INPUT" ]; then
        BACKUP_FILE="$BACKUP_INPUT"
    elif [ -f "$BACKUP_DIR/$BACKUP_INPUT" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_INPUT"
    else
        error "Backup file tidak ditemukan: $BACKUP_INPUT"
        exit 1
    fi
fi

if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file tidak ditemukan!"
    exit 1
fi

log "Backup file: $BACKUP_FILE"
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Size: $BACKUP_SIZE"

# Confirmation
echo ""
warning "WARNING: Ini akan menghapus semua data di database '$DB_NAME' dan menggantinya dengan backup!"
read -p "Apakah Anda yakin? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "Restore dibatalkan"
    exit 0
fi

# Create a backup of current database before restore
log "Membuat backup database saat ini sebelum restore..."
bash backup.sh

# Decompress if needed
RESTORE_FILE="$BACKUP_FILE"
if [[ $BACKUP_FILE == *.gz ]]; then
    log "Decompressing backup..."
    RESTORE_FILE="${BACKUP_FILE%.gz}"
    gunzip -c "$BACKUP_FILE" > "$RESTORE_FILE"
fi

# Restore database
log "Restoring database..."

if docker ps | grep -q news-mysql; then
    log "Using Docker MySQL container..."
    docker exec -i news-mysql mysql \
        -u${DB_USER} \
        -p${DB_PASSWORD} \
        ${DB_NAME} \
        < "$RESTORE_FILE"
else
    log "Using local MySQL..."
    mysql \
        -h${DB_HOST} \
        -P${DB_PORT} \
        -u${DB_USER} \
        -p${DB_PASSWORD} \
        ${DB_NAME} \
        < "$RESTORE_FILE"
fi

# Cleanup decompressed file
if [ "$RESTORE_FILE" != "$BACKUP_FILE" ]; then
    rm -f "$RESTORE_FILE"
fi

log "✓ Restore completed successfully!"
log "================================"
log "Database '$DB_NAME' telah di-restore dari backup"
log "================================"
