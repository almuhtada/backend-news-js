#!/bin/bash

# Direct VPS Setup Script
# Jalankan langsung di VPS (bukan dari local machine)

set -e

# Colors
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
echo "Direct VPS Setup"
echo "================================"
echo ""

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
        log "Detected OS: $PRETTY_NAME"
    elif [ -f /etc/redhat-release ]; then
        OS="rhel"
        VER=$(cat /etc/redhat-release | grep -oE '[0-9]+\.[0-9]+' | head -1)
        log "Detected OS: RHEL/CentOS $VER"
    else
        error "Cannot detect OS"
        exit 1
    fi
}

# Update system
update_system() {
    log "Updating system packages..."

    case $OS in
        ubuntu|debian)
            apt-get update
            apt-get upgrade -y
            apt-get install -y curl wget git rsync nano
            ;;
        almalinux|rocky|rhel|centos|fedora)
            if command -v dnf &> /dev/null; then
                dnf update -y
                dnf install -y curl wget git rsync nano
            else
                yum update -y
                yum install -y curl wget git rsync nano
            fi
            ;;
        *)
            error "Unsupported OS: $OS"
            exit 1
            ;;
    esac
}

# Install Docker
install_docker() {
    if ! command -v docker &> /dev/null; then
        log "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        systemctl enable docker
        systemctl start docker
        rm -f get-docker.sh
        log "✓ Docker installed"
    else
        log "✓ Docker already installed: $(docker --version)"
    fi
}

# Install Docker Compose
install_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        log "Installing Docker Compose..."

        if docker compose version &> /dev/null; then
            # Docker Compose plugin already available
            echo '#!/bin/bash' > /usr/local/bin/docker-compose
            echo 'docker compose "$@"' >> /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        else
            # Install standalone
            COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
            curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        fi

        log "✓ Docker Compose installed: $(docker-compose --version)"
    else
        log "✓ Docker Compose already installed: $(docker-compose --version)"
    fi
}

# Setup firewall
setup_firewall() {
    log "Configuring firewall..."

    case $OS in
        ubuntu|debian)
            if command -v ufw &> /dev/null; then
                ufw --force enable
                ufw allow 22/tcp comment 'SSH'
                ufw allow 80/tcp comment 'HTTP'
                ufw allow 443/tcp comment 'HTTPS'
                ufw allow 3001/tcp comment 'Backend API'
                ufw reload
                log "✓ UFW configured"
            fi
            ;;
        almalinux|rocky|rhel|centos|fedora)
            if command -v firewall-cmd &> /dev/null; then
                systemctl enable --now firewalld
                firewall-cmd --permanent --add-service=ssh
                firewall-cmd --permanent --add-service=http
                firewall-cmd --permanent --add-service=https
                firewall-cmd --permanent --add-port=3001/tcp
                firewall-cmd --reload
                log "✓ firewalld configured"
            fi
            ;;
    esac
}

# Handle SELinux
handle_selinux() {
    if command -v getenforce &> /dev/null; then
        if [ "$(getenforce)" != "Disabled" ]; then
            warning "SELinux detected. Setting to permissive mode..."
            setenforce 0
            sed -i 's/^SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
            log "SELinux set to permissive"
        fi
    fi
}

# Create directories
create_app_dirs() {
    log "Creating application directories..."
    mkdir -p /var/www/backend-news-js/{uploads,backups,logs}
    chmod -R 755 /var/www/backend-news-js
    log "✓ Directories created"
}

# Main
detect_os
update_system
install_docker
install_docker_compose
setup_firewall
handle_selinux
create_app_dirs

echo ""
log "================================"
log "✓ Setup Complete!"
log "================================"
log ""
log "Installed:"
log "  - Docker: $(docker --version)"
log "  - Docker Compose: $(docker-compose --version)"
log ""
log "Next Steps:"
log "1. Upload project files ke /var/www/news-backend"
log "2. cd /var/www/news-backend"
log "3. Create/edit .env file"
log "4. docker-compose up -d"
log "================================"
