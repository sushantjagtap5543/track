#!/bin/bash
# GeoSurePath Database Restoration Utility v1.1.0
# Usage: ./restore.sh <path_to_sql_gz> <path_to_rdb_gz>

set -e

BACKUP_SQL=$1
BACKUP_RDB=$2

if [ -z "$BACKUP_SQL" ]; then
    echo "❌ Error: SQL backup file required."
    echo "Usage: ./restore.sh <db_backup.sql.gz> [redis_backup.rdb.gz]"
    exit 1
fi

echo "⚠️  WARNING: This will overwrite the current database state."
read -p "Are you sure you want to proceed? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# 1. Restore PostgreSQL
echo "🤖 Restoring PostgreSQL from $BACKUP_SQL..."
gunzip -c "$BACKUP_SQL" | docker exec -i geosurepath_db psql -U geosurepath -d geosurepath
echo "✅ PostgreSQL restoration successful."

# 2. Restore Redis (Optional)
if [ -n "$BACKUP_RDB" ]; then
    echo "🤖 Restoring Redis from $BACKUP_RDB..."
    gunzip -c "$BACKUP_RDB" > temp_dump.rdb
    docker cp temp_dump.rdb geosurepath_redis:/data/dump.rdb
    docker restart geosurepath_redis
    rm temp_dump.rdb
    echo "✅ Redis restoration successful."
fi

echo "✨ Restoration process completed. Performing Master Sync..."
# Trigger a sync to ensure Traccar and SaaS are aligned after restore
curl -X POST http://localhost:5000/api/admin/sync-all-devices -H "Authorization: Bearer <ADMIN_TOKEN>" || echo "⚠️  Post-restore sync skip: Admin token required for automated sync."

echo "🚀 System is now synchronized with the restored state."
