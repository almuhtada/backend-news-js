#!/bin/bash

# Monitoring Script untuk News Backend
# Cek status aplikasi dan kirim alert jika down

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
HEALTH_URL="http://localhost:3001/health"
MAX_RETRIES=3
RETRY_DELAY=5

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

check_health() {
    local retries=0

    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
            return 0
        fi

        retries=$((retries + 1))
        if [ $retries -lt $MAX_RETRIES ]; then
            warning "Health check failed, retry $retries/$MAX_RETRIES..."
            sleep $RETRY_DELAY
        fi
    done

    return 1
}

check_docker() {
    if command -v docker-compose &> /dev/null; then
        if docker ps | grep -q news-backend; then
            log "✓ Docker container running"
            return 0
        else
            error "✗ Docker container not running"
            return 1
        fi
    fi
    return 0
}

check_pm2() {
    if command -v pm2 &> /dev/null; then
        if pm2 list | grep -q "news-backend.*online"; then
            log "✓ PM2 process running"
            return 0
        else
            warning "PM2 process not found or not online"
            return 1
        fi
    fi
    return 0
}

auto_restart() {
    log "Attempting auto-restart..."

    # Try Docker first
    if command -v docker-compose &> /dev/null && [ -f docker-compose.yml ]; then
        log "Restarting with Docker..."
        docker-compose restart backend
        sleep 10

        if check_health; then
            log "✓ Successfully restarted with Docker"
            return 0
        fi
    fi

    # Try PM2
    if command -v pm2 &> /dev/null; then
        log "Restarting with PM2..."
        pm2 restart news-backend
        sleep 10

        if check_health; then
            log "✓ Successfully restarted with PM2"
            return 0
        fi
    fi

    # Try systemd
    if command -v systemctl &> /dev/null; then
        log "Restarting with systemd..."
        systemctl restart news-backend
        sleep 10

        if check_health; then
            log "✓ Successfully restarted with systemd"
            return 0
        fi
    fi

    error "Failed to restart application"
    return 1
}

send_notification() {
    local message="$1"
    local status="$2"

    # Telegram notification (jika configured)
    if [ -f .env ]; then
        source .env
        if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
            curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
                -d chat_id="${TELEGRAM_CHAT_ID}" \
                -d text="🚨 *News Backend Alert*%0A%0A${message}%0A%0AStatus: ${status}%0ATime: $(date)" \
                -d parse_mode="Markdown" > /dev/null
        fi
    fi
}

# Main monitoring
echo "================================"
echo "News Backend Health Monitor"
echo "================================"
echo ""

# Check health endpoint
log "Checking health endpoint: $HEALTH_URL"

if check_health; then
    log "✓ Health check passed"

    # Get health details
    HEALTH_DATA=$(curl -s "$HEALTH_URL")
    echo "$HEALTH_DATA" | jq . 2>/dev/null || echo "$HEALTH_DATA"

    # Check container/process status
    check_docker
    check_pm2

    log "✓ All systems operational"
    exit 0
else
    error "✗ Health check failed after $MAX_RETRIES attempts"

    # Check what's running
    check_docker
    check_pm2

    # Auto-restart
    read -p "Attempt auto-restart? (yes/no): " SHOULD_RESTART

    if [ "$SHOULD_RESTART" = "yes" ]; then
        if auto_restart; then
            send_notification "Application was down and has been restarted successfully" "RECOVERED"
            log "✓ Application recovered"
            exit 0
        else
            send_notification "Application is down and auto-restart failed" "CRITICAL"
            error "Manual intervention required!"
            exit 1
        fi
    else
        send_notification "Application is down - awaiting manual intervention" "DOWN"
        error "Application is down"
        exit 1
    fi
fi
