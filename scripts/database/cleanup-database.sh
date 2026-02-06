#!/bin/bash

###############################################################################
# Database Cleanup Script
# Auto backup dan drop semua tabel WordPress (wp8o_*)
###############################################################################

set -e  # Exit on error

echo "=========================================="
echo "🧹 Database Cleanup - Drop WordPress Tables"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ Loaded .env file${NC}"
else
    echo -e "${RED}❌ .env file not found!${NC}"
    exit 1
fi

# Database credentials from .env
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
DB_NAME=${DB_NAME}

if [ -z "$DB_USER" ] || [ -z "$DB_PASS" ] || [ -z "$DB_NAME" ]; then
    echo -e "${RED}❌ Database credentials not found in .env${NC}"
    echo "Required: DB_HOST, DB_USER, DB_PASS, DB_NAME"
    exit 1
fi

echo -e "${YELLOW}📋 Database Info:${NC}"
echo "   Host: $DB_HOST"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Create backup directory
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR
echo -e "${GREEN}✅ Backup directory ready: $BACKUP_DIR${NC}"
echo ""

# Backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/backup_before_cleanup_$(date +%Y%m%d_%H%M%S).sql"

# Step 1: Backup database
echo -e "${YELLOW}💾 Step 1/4: Creating database backup...${NC}"
echo "   Backup file: $BACKUP_FILE"
echo ""

if mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup created successfully! Size: $BACKUP_SIZE${NC}"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    echo "Please check database credentials and try again."
    exit 1
fi
echo ""

# Step 2: Show tables to be dropped
echo -e "${YELLOW}🗑️  Step 2/4: Tables yang akan di-drop:${NC}"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES LIKE 'wp8o_%';" 2>/dev/null | tail -n +2 | while read table; do
    echo "   ✗ $table"
done
echo ""

# Step 3: Confirmation
echo -e "${RED}⚠️  WARNING: This will permanently delete all WordPress tables!${NC}"
echo -e "${YELLOW}Backup saved at: $BACKUP_FILE${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}❌ Cleanup cancelled.${NC}"
    echo "Backup file is still available at: $BACKUP_FILE"
    exit 0
fi
echo ""

# Step 4: Drop tables
echo -e "${YELLOW}🔥 Step 3/4: Dropping WordPress tables...${NC}"
if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < drop-wp8o-tables.sql 2>/dev/null; then
    echo -e "${GREEN}✅ WordPress tables dropped successfully!${NC}"
else
    echo -e "${RED}❌ Failed to drop tables!${NC}"
    echo "Your backup is safe at: $BACKUP_FILE"
    exit 1
fi
echo ""

# Step 5: Verify cleanup
echo -e "${YELLOW}🔍 Step 4/4: Verifying cleanup...${NC}"
WP_TABLES=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES LIKE 'wp8o_%';" 2>/dev/null | tail -n +2 | wc -l)
TOTAL_TABLES=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null | tail -n +2 | wc -l)

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Cleanup completed!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}📊 Summary:${NC}"
echo "   WordPress tables remaining: $WP_TABLES"
echo "   Total tables in database: $TOTAL_TABLES"
echo "   Backup file: $BACKUP_FILE"
echo "   Backup size: $BACKUP_SIZE"
echo ""

if [ "$WP_TABLES" -eq "0" ]; then
    echo -e "${GREEN}✅ All WordPress tables successfully removed!${NC}"
else
    echo -e "${YELLOW}⚠️  Some WordPress tables still exist${NC}"
fi
echo ""

# Show remaining custom tables
echo -e "${YELLOW}📋 Remaining tables in database:${NC}"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null | tail -n +2 | while read table; do
    echo "   ✓ $table"
done
echo ""

# Show database size
echo -e "${YELLOW}💾 Database size after cleanup:${NC}"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "
SELECT
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = '$DB_NAME'
GROUP BY table_schema;
" 2>/dev/null
echo ""

echo "=========================================="
echo -e "${GREEN}🎉 Database cleanup successful!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "   1. Test backend API endpoints"
echo "   2. Verify data masih ada (posts, categories, users)"
echo "   3. If everything OK, backup bisa di-archive"
echo "   4. If ada masalah, restore dengan:"
echo "      mysql -u $DB_USER -p $DB_NAME < $BACKUP_FILE"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""
