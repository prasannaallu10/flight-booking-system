#!/bin/sh
# wait-for-mysql.sh

set -e

host="$DB_HOST"
port=3306

echo "⏳ Waiting for MySQL at $host:$port..."

while ! nc -z "$host" $port; do
  echo "❌ MySQL not ready, retrying in 5 seconds..."
  sleep 5
done

echo "✅ MySQL is up!"
exec "$@"
