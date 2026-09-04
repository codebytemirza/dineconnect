#!/bin/bash
# Supabase Keep-Alive Cron Script
# Runs every 6 hours to prevent Supabase project from pausing
# Add to crontab: 0 */6 * * * /home/ubuntu/dineconnect/keep-alive.sh >> /home/ubuntu/logs/keep-alive.log 2>&1

set -e

PROJECT_DIR="/home/ubuntu/dineconnect"
LOG_FILE="/home/ubuntu/logs/keep-alive.log"

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

echo "[$(date)] 🔄 Starting Supabase keep-alive..." >> "$LOG_FILE"

# Method 1: Simple HTTP request to Supabase REST API
# This wakes up the PostgREST API
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_KEY="${SUPABASE_ANON_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "[$(date)] ❌ Missing Supabase credentials in .env" >> "$LOG_FILE"
  exit 1
fi

# Make a lightweight query to keep the database active
# Query a small table (restaurants) with minimal data
response=$(curl -s -w "\n%{http_code}" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: count=exact" \
  "$SUPABASE_URL/rest/v1/restaurants?select=id&limit=1" \
  --max-time 30)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 204 ]; then
  echo "[$(date)] ✅ Keep-alive successful (HTTP $http_code)" >> "$LOG_FILE"
else
  echo "[$(date)] ⚠️ Keep-alive returned HTTP $http_code" >> "$LOG_FILE"
  echo "[$(date)] Response: $body" >> "$LOG_FILE"
fi

# Method 2: Also ping the auth endpoint to keep auth service warm
auth_response=$(curl -s -w "\n%{http_code}" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  "$SUPABASE_URL/auth/v1/health" \
  --max-time 10)

auth_code=$(echo "$auth_response" | tail -n1)
if [ "$auth_code" -eq 200 ]; then
  echo "[$(date)] ✅ Auth health check OK" >> "$LOG_FILE"
else
  echo "[$(date)] ⚠️ Auth health check returned HTTP $auth_code" >> "$LOG_FILE"
fi

echo "[$(date)] 🔄 Keep-alive complete" >> "$LOG_FILE"