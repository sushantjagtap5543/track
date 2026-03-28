#!/bin/bash
# GeoSurePath Database Backup Script v1.1.0

# ✅ Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/traccar/backups}"
DB_CONTAINER="${DB_CONTAINER:-geosurepath_db}"
DB_USER="${DB_USER:-geosurepath}"
DB_NAME="${DB_NAME:-geosurepath}"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

echo "🤖 Starting backup for $DB_NAME..."

# ✅ Pre-checks
if ! command -v docker &> /dev/null; then
    echo "❌ Error: docker is not installed."
    exit 1
fi

if ! command -v gzip &> /dev/null; then
    echo "❌ Error: gzip is not installed."
    exit 1
fi

mkdir -p "$BACKUP_DIR"

# ✅ Execution
if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    echo "✅ Backup successful: $BACKUP_FILE"
else
    echo "❌ Backup failed!"
    exit 1
fi

# ✅ Cleanup: Keep only the last 7 days of backups
echo "🧹 Cleaning up old backups (>7 days)..."
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete

echo "✨ Done."
