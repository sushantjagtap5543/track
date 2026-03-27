#!/bin/bash
BACKUP_DIR="/opt/traccar/backups"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"
docker exec geosurepath_db pg_dump -U geosurepath geosurepath | gzip > "$BACKUP_FILE"

# Keep only the last 7 days of backups to save disk space
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete
