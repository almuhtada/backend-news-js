#!/bin/bash

# Script untuk fix semua referensi posts → posts
# Auto-fix WordPress table references

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "================================"
echo "Fix WordPress References Script"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    error "Not in backend-news-express directory!"
    echo "Please run: cd /Users/mm/Desktop/news/backend-news-express"
    exit 1
fi

log "Current directory: $(pwd)"
echo ""

# Create backup directory
BACKUP_DIR="./backups-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
log "Backup directory created: $BACKUP_DIR"
echo ""

# List of files to fix
FILES=(
    "schema/notification.js"
    "migrateTagsToNewTable.js"
)

# Find additional files with posts references (excluding node_modules, docs, etc)
log "Searching for files with posts references..."
ADDITIONAL_FILES=$(grep -rl "posts" --exclude-dir=node_modules --exclude-dir=.git \
    --exclude="*.md" --exclude="QUICK-START.md" --exclude="README.md" \
    --exclude="MIGRATION-GUIDE.md" --exclude="DEPLOYMENT.md" \
    . 2>/dev/null || true)

if [ -n "$ADDITIONAL_FILES" ]; then
    while IFS= read -r file; do
        # Remove leading ./
        file="${file#./}"
        # Skip if already in FILES array
        if [[ ! " ${FILES[@]} " =~ " ${file} " ]]; then
            FILES+=("$file")
        fi
    done <<< "$ADDITIONAL_FILES"
fi

echo ""
log "Found ${#FILES[@]} file(s) to fix:"
for file in "${FILES[@]}"; do
    echo "  - $file"
done
echo ""

# Confirm
read -p "Continue with fixes? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    warning "Cancelled by user"
    exit 0
fi

echo ""
log "Starting fixes..."
echo ""

FIXED_COUNT=0

# Fix each file
for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        warning "File not found: $file (skipping)"
        continue
    fi

    log "Processing: $file"

    # Backup original file
    cp "$file" "$BACKUP_DIR/"
    echo "  ✓ Backup created"

    # Count replacements before
    BEFORE_COUNT=$(grep -o "posts\|posts[^s]" "$file" | wc -l || echo 0)

    if [ "$BEFORE_COUNT" -eq 0 ]; then
        echo "  ℹ No posts references found (skipping)"
        continue
    fi

    # Replace posts → posts
    # Be careful: posts → posts, but not posts → post (singular)
    sed -i.tmp 's/"posts"/"posts"/g' "$file"
    sed -i.tmp "s/'posts'/'posts'/g" "$file"
    sed -i.tmp 's/posts/posts/g' "$file"

    # Fix singular posts → posts (for table references)
    sed -i.tmp 's/posts\([^s]\)/posts\1/g' "$file"

    # Remove temp file
    rm -f "$file.tmp"

    # Count replacements after
    AFTER_COUNT=$(grep -o "posts\|posts[^s]" "$file" | wc -l || echo 0)

    REPLACED=$((BEFORE_COUNT - AFTER_COUNT))

    if [ "$REPLACED" -gt 0 ]; then
        echo "  ✓ Replaced $REPLACED reference(s)"
        FIXED_COUNT=$((FIXED_COUNT + 1))
    else
        echo "  ℹ No changes made"
    fi

    echo ""
done

echo ""
log "================================"
log "Fix Summary"
log "================================"
log "Files processed: ${#FILES[@]}"
log "Files modified: $FIXED_COUNT"
log "Backups saved in: $BACKUP_DIR"
echo ""

# Show changes
if [ "$FIXED_COUNT" -gt 0 ]; then
    log "Modified files:"
    for file in "${FILES[@]}"; do
        if [ -f "$BACKUP_DIR/$file" ]; then
            echo "  - $file"
        fi
    done
    echo ""

    log "Verify changes with:"
    echo "  diff $BACKUP_DIR/schema/notification.js schema/notification.js"
    echo ""
fi

# Ask to upload to VPS
read -p "Upload fixed files to VPS? (yes/no): " UPLOAD
if [ "$UPLOAD" = "yes" ]; then
    read -p "Enter VPS IP [202.10.34.89]: " VPS_IP
    VPS_IP=${VPS_IP:-202.10.34.89}

    log "Uploading to VPS: $VPS_IP"

    # Upload each modified file
    for file in "${FILES[@]}"; do
        if [ -f "$file" ] && [ -f "$BACKUP_DIR/$file" ]; then
            log "Uploading: $file"
            scp "$file" "root@$VPS_IP:/var/www/backend-news-js/$file"
        fi
    done

    echo ""
    log "Files uploaded successfully!"
    echo ""
    log "Restart backend on VPS with:"
    echo "  ssh root@$VPS_IP 'cd /var/www/backend-news-js && docker-compose restart backend'"
fi

echo ""
log "================================"
log "Done! ✓"
log "================================"
