#!/bin/bash

# AlmaLinux/RHEL/Rocky Linux Setup Script
# Khusus untuk AlmaLinux 8+, RHEL 8+, Rocky Linux 8+

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

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "================================"
echo "AlmaLinux/RHEL Setup Script"
echo "================================"

# Detect package manager
if command -v dnf &> /dev/null; then
    PKG_MGR="dnf"
else
    PKG_MGR="yum"
fi

log "Using package manager: $PKG_MGR"

# Update system
log "Updating system packages..."
$PKG_MGR update -y
$PKG_MGR install -y curl wget git rsync

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
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    $PKG_MGR install -y nodejs
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
    $PKG_MGR install -y nginx
    systemctl enable nginx
    systemctl start nginx
    log "✓ Nginx installed"
fi

# Setup firewalld
if command -v firewall-cmd &> /dev/null; then
    log "Configuring firewalld..."
    systemctl enable firewalld
    systemctl start firewalld
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-port=3001/tcp
    firewall-cmd --reload
    log "✓ firewalld configured"
fi

# Handle SELinux
if command -v getenforce &> /dev/null; then
    if [ "$(getenforce)" != "Disabled" ]; then
        warning "SELinux is enabled"
        echo ""
        echo "Pilihan SELinux:"
        echo "1) Set to Permissive (recommended untuk testing)"
        echo "2) Keep Enforcing (perlu konfigurasi manual nanti)"
        echo "3) Disable permanently (not recommended for production)"
        read -p "Pilih (1/2/3): " SELINUX_CHOICE

        case $SELINUX_CHOICE in
            1)
                setenforce 0
                sed -i 's/^SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
                log "SELinux set to permissive mode"
                ;;
            2)
                log "SELinux tetap enforcing. Anda perlu configure contexts nanti."
                warning "Gunakan: setsebool -P httpd_can_network_connect 1"
                warning "Dan: semanage port -a -t http_port_t -p tcp 3001"
                ;;
            3)
                sed -i 's/^SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config
                log "SELinux akan disabled setelah reboot"
                ;;
        esac
    fi
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
log ""
warning "CATATAN: Jika SELinux enforcing, Anda mungkin perlu configure policies"
