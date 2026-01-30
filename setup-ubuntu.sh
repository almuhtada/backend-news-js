#!/bin/bash

# Ubuntu/Debian Setup Script
# Khusus untuk Ubuntu 20.04+, Debian 11+

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "================================"
echo "Ubuntu/Debian Setup Script"
echo "================================"

# Update system
log "Updating system packages..."
apt-get update
apt-get upgrade -y
apt-get install -y curl wget git rsync

# Install Docker
if ! command -v docker &> /dev/null; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    rm -f get-docker.sh
    log "✓ Docker installed"
else
    log "✓ Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    log "Installing Docker Compose..."
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    log "✓ Docker Compose installed"
else
    log "✓ Docker Compose already installed"
fi

# Install Node.js
if ! command -v node &> /dev/null; then
    log "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    log "✓ Node.js installed: $(node --version)"
else
    log "✓ Node.js already installed: $(node --version)"
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    log "Installing PM2..."
    npm install -g pm2
    pm2 startup systemd
    log "✓ PM2 installed"
else
    log "✓ PM2 already installed"
fi

# Install Nginx (optional)
read -p "Install Nginx untuk reverse proxy? (y/n): " INSTALL_NGINX
if [ "$INSTALL_NGINX" = "y" ]; then
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
    log "✓ Nginx installed"
fi

# Setup UFW firewall
if command -v ufw &> /dev/null; then
    log "Configuring UFW firewall..."
    ufw --force enable
    ufw allow 22/tcp comment 'SSH'
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    ufw allow 3001/tcp comment 'Backend API'
    ufw reload
    log "✓ UFW configured"
fi

# Create directories
log "Creating application directories..."
mkdir -p /var/www/news-backend/{uploads,backups,logs}
chmod -R 755 /var/www/news-backend

log "================================"
log "Setup completed!"
log "================================"
log "Installed:"
log "  - Docker: $(docker --version)"
log "  - Docker Compose: $(docker-compose --version)"
log "  - Node.js: $(node --version)"
log "  - npm: $(npm --version)"
log "  - PM2: $(pm2 --version)"
log "================================"
log "Next: Upload aplikasi Anda ke /var/www/news-backend"
