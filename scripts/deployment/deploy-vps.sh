#!/bin/bash

# VPS Deployment Script
# Script untuk deploy pertama kali ke VPS

set -e

echo "================================"
echo "VPS First-Time Deployment Setup"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration - EDIT INI
VPS_USER="root"
VPS_HOST="your-vps-ip"
VPS_PORT="22"
APP_DIR="/var/www/news-backend"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if SSH key exists
if [ ! -f ~/.ssh/id_rsa ]; then
    warning "SSH key tidak ditemukan. Pastikan Anda sudah setup SSH key ke VPS"
    echo "Generate dengan: ssh-keygen -t rsa -b 4096"
    exit 1
fi

log "Koneksi ke VPS: $VPS_USER@$VPS_HOST"

# Create installation script with OS auto-detection
cat > /tmp/vps-setup.sh << 'EOF'
#!/bin/bash
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

# Update system based on OS
update_system() {
    log "Updating system..."

    case $OS in
        ubuntu|debian)
            apt-get update
            apt-get upgrade -y
            apt-get install -y curl wget git rsync
            ;;
        almalinux|rocky|rhel|centos|fedora)
            if command -v dnf &> /dev/null; then
                dnf update -y
                dnf install -y curl wget git rsync
            else
                yum update -y
                yum install -y curl wget git rsync
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

        # Add current user to docker group (if not root)
        if [ "$USER" != "root" ]; then
            usermod -aG docker $USER
            log "Added $USER to docker group. You may need to re-login."
        fi

        rm -f get-docker.sh
        log "✓ Docker installed successfully"
    else
        log "✓ Docker already installed"
    fi
}

# Install Docker Compose
install_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        log "Installing Docker Compose..."

        # Try docker compose plugin first (newer method)
        if docker compose version &> /dev/null; then
            log "✓ Docker Compose plugin already available"
            # Create alias for docker-compose
            echo '#!/bin/bash' > /usr/local/bin/docker-compose
            echo 'docker compose "$@"' >> /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        else
            # Install standalone docker-compose
            COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
            curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        fi

        log "✓ Docker Compose installed successfully"
    else
        log "✓ Docker Compose already installed"
    fi
}

# Install Node.js
install_nodejs() {
    if ! command -v node &> /dev/null; then
        log "Installing Node.js 18..."

        case $OS in
            ubuntu|debian)
                curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
                apt-get install -y nodejs
                ;;
            almalinux|rocky|rhel|centos|fedora)
                # Install from NodeSource
                curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
                if command -v dnf &> /dev/null; then
                    dnf install -y nodejs
                else
                    yum install -y nodejs
                fi
                ;;
        esac

        log "✓ Node.js installed: $(node --version)"
        log "✓ npm installed: $(npm --version)"
    else
        log "✓ Node.js already installed: $(node --version)"
    fi
}

# Install PM2
install_pm2() {
    if ! command -v pm2 &> /dev/null; then
        log "Installing PM2..."
        npm install -g pm2

        # Setup PM2 startup script
        pm2 startup systemd -u root --hp /root

        log "✓ PM2 installed successfully"
    else
        log "✓ PM2 already installed"
    fi
}

# Setup firewall
setup_firewall() {
    log "Configuring firewall..."

    case $OS in
        ubuntu|debian)
            if command -v ufw &> /dev/null; then
                # UFW is available
                log "Configuring UFW..."
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
                # firewalld is available
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
            ;;
    esac
}

# Disable SELinux (for AlmaLinux/RHEL if needed)
handle_selinux() {
    if command -v getenforce &> /dev/null; then
        if [ "$(getenforce)" != "Disabled" ]; then
            warning "SELinux is enabled. Setting to permissive mode..."
            setenforce 0
            sed -i 's/^SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
            log "SELinux set to permissive mode"
            log "Note: Anda bisa re-enable SELinux nanti dengan konfigurasi yang tepat"
        fi
    fi
}

# Create directories
create_directories() {
    log "Creating application directories..."
    mkdir -p /var/www/news-backend
    mkdir -p /var/www/news-backend/uploads
    mkdir -p /var/www/news-backend/backups
    mkdir -p /var/www/news-backend/logs
    chmod -R 755 /var/www/news-backend
    log "✓ Directories created"
}

# Main installation
echo "================================"
echo "VPS Auto Setup Script"
echo "================================"

detect_os
update_system
install_docker
install_docker_compose
install_nodejs
install_pm2
setup_firewall
handle_selinux
create_directories

echo ""
log "================================"
log "Setup completed successfully!"
log "================================"
log "Installed:"
log "  - Docker: $(docker --version)"
log "  - Docker Compose: $(docker-compose --version)"
log "  - Node.js: $(node --version)"
log "  - PM2: $(pm2 --version)"
log "================================"
EOF

# Upload and run setup script
log "Uploading setup script ke VPS..."
scp -P $VPS_PORT /tmp/vps-setup.sh $VPS_USER@$VPS_HOST:/tmp/

log "Running setup script di VPS..."
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST 'bash /tmp/vps-setup.sh'

# Upload project files
log "Uploading project files..."
rsync -avz --exclude 'node_modules' \
           --exclude '.git' \
           --exclude 'uploads/*' \
           --exclude 'logs/*' \
           --exclude 'backups/*' \
           -e "ssh -p $VPS_PORT" \
           ./ $VPS_USER@$VPS_HOST:$APP_DIR/

# Create .env on VPS
log "Setup .env file di VPS..."
warning "PENTING: Edit .env di VPS dengan konfigurasi production!"
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << EOF
cd $APP_DIR
if [ ! -f .env ]; then
    cat > .env << 'ENVFILE'
DB_HOST=mysql
DB_USER=newsuser
DB_PASSWORD=CHANGE_THIS_PASSWORD
DB_NAME=news_db
DB_PORT=3306
JWT_SECRET=CHANGE_THIS_SECRET_KEY
PORT=3001

GROQ_API_KEY=your_groq_api_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_chat_id
TELEGRAM_TOPIC_PENULIS=3
TELEGRAM_TOPIC_EDITOR=2

BACKEND_URL=http://your-domain.com
NODE_ENV=production
ENVFILE
    echo ".env created. EDIT FILE INI SEBELUM START!"
fi
EOF

log "Starting Docker containers..."
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << EOF
cd $APP_DIR
docker-compose up -d
EOF

log "================================"
log "VPS Deployment completed!"
log "================================"
log ""
log "NEXT STEPS:"
log "1. SSH ke VPS: ssh -p $VPS_PORT $VPS_USER@$VPS_HOST"
log "2. Edit .env: cd $APP_DIR && nano .env"
log "3. Restart containers: docker-compose restart"
log "4. Check logs: docker-compose logs -f"
log ""
log "Setup PM2 (alternative to Docker):"
log "  ssh $VPS_USER@$VPS_HOST"
log "  cd $APP_DIR"
log "  npm install"
log "  pm2 start ecosystem.config.js --env production"
log "  pm2 save"
log "================================"
