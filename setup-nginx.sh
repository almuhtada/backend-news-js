#!/bin/bash

###############################################################################
# Nginx Setup Script for News API Backend
# Auto-setup Nginx reverse proxy untuk Express backend
###############################################################################

set -e  # Exit on error

echo "=========================================="
echo "🚀 Nginx Setup untuk News API Backend"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo -e "${RED}❌ Cannot detect OS${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Detected OS: $OS${NC}"
echo ""

# Install Nginx
echo -e "${YELLOW}📦 Installing Nginx...${NC}"
if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
    sudo apt update
    sudo apt install nginx -y
    NGINX_USER="www-data"
elif [[ "$OS" == "almalinux" ]] || [[ "$OS" == "centos" ]] || [[ "$OS" == "rhel" ]]; then
    sudo dnf install nginx -y
    NGINX_USER="nginx"
else
    echo -e "${RED}❌ Unsupported OS: $OS${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Nginx installed${NC}"
echo ""

# Enable and start Nginx
echo -e "${YELLOW}🔧 Enabling Nginx service...${NC}"
sudo systemctl enable nginx
sudo systemctl start nginx
echo -e "${GREEN}✅ Nginx service started${NC}"
echo ""

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR"

# Create sites-available and sites-enabled if not exist (for RHEL-based)
if [[ "$OS" == "almalinux" ]] || [[ "$OS" == "centos" ]] || [[ "$OS" == "rhel" ]]; then
    sudo mkdir -p /etc/nginx/sites-available
    sudo mkdir -p /etc/nginx/sites-enabled

    # Add include to nginx.conf if not already there
    if ! grep -q "sites-enabled" /etc/nginx/nginx.conf; then
        sudo sed -i '/http {/a \    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
    fi
fi

# Copy nginx config
echo -e "${YELLOW}📝 Copying Nginx configuration...${NC}"
sudo cp "$SCRIPT_DIR/nginx-api.conf" /etc/nginx/sites-available/news-api

# Update paths in config
echo -e "${YELLOW}🔧 Updating paths in configuration...${NC}"
sudo sed -i "s|/home/news/backend-news-express|$BACKEND_DIR|g" /etc/nginx/sites-available/news-api

# Create symbolic link
echo -e "${YELLOW}🔗 Creating symbolic link...${NC}"
sudo rm -f /etc/nginx/sites-enabled/news-api
sudo ln -s /etc/nginx/sites-available/news-api /etc/nginx/sites-enabled/

# Remove default config (optional)
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo -e "${YELLOW}🗑️  Removing default nginx config...${NC}"
    sudo rm /etc/nginx/sites-enabled/default
fi

echo -e "${GREEN}✅ Configuration copied${NC}"
echo ""

# Fix permissions for uploads
echo -e "${YELLOW}🔐 Setting permissions for uploads directory...${NC}"
if [ -d "$BACKEND_DIR/uploads" ]; then
    sudo chown -R $NGINX_USER:$NGINX_USER "$BACKEND_DIR/uploads"
    sudo chmod -R 755 "$BACKEND_DIR/uploads"
    echo -e "${GREEN}✅ Permissions set${NC}"
else
    echo -e "${YELLOW}⚠️  Uploads directory not found, creating...${NC}"
    mkdir -p "$BACKEND_DIR/uploads"
    sudo chown -R $NGINX_USER:$NGINX_USER "$BACKEND_DIR/uploads"
    sudo chmod -R 755 "$BACKEND_DIR/uploads"
    echo -e "${GREEN}✅ Uploads directory created${NC}"
fi
echo ""

# Test nginx config
echo -e "${YELLOW}🧪 Testing Nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    exit 1
fi
echo ""

# Reload nginx
echo -e "${YELLOW}🔄 Reloading Nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✅ Nginx reloaded${NC}"
echo ""

# Setup firewall
echo -e "${YELLOW}🔥 Setting up firewall...${NC}"
if command -v ufw &> /dev/null; then
    # UFW (Ubuntu)
    sudo ufw allow 'Nginx Full' || true
    echo -e "${GREEN}✅ UFW rules added${NC}"
elif command -v firewall-cmd &> /dev/null; then
    # FirewallD (RHEL/AlmaLinux)
    sudo firewall-cmd --permanent --add-service=http || true
    sudo firewall-cmd --permanent --add-service=https || true
    sudo firewall-cmd --reload || true
    echo -e "${GREEN}✅ Firewall rules added${NC}"
fi
echo ""

# Check if backend is running
echo -e "${YELLOW}🔍 Checking backend status...${NC}"
if curl -s http://localhost:3001 > /dev/null; then
    echo -e "${GREEN}✅ Backend is running on port 3001${NC}"
else
    echo -e "${RED}⚠️  Backend is NOT running on port 3001${NC}"
    echo -e "${YELLOW}💡 Start backend with: pm2 start ecosystem.config.js${NC}"
fi
echo ""

# Print next steps
echo "=========================================="
echo -e "${GREEN}✅ Nginx setup completed!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "1. ${GREEN}Setup SSL Certificate (HTTPS):${NC}"
echo "   sudo apt install certbot python3-certbot-nginx -y"
echo "   sudo certbot --nginx -d api.almuhtada.org"
echo ""
echo "2. ${GREEN}Start Backend (if not running):${NC}"
echo "   cd $BACKEND_DIR"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "3. ${GREEN}Test Your API:${NC}"
echo "   curl http://api.almuhtada.org/api/posts"
echo "   curl https://api.almuhtada.org/api/posts (after SSL)"
echo ""
echo "4. ${GREEN}View Logs:${NC}"
echo "   sudo tail -f /var/log/nginx/news-api-access.log"
echo "   sudo tail -f /var/log/nginx/news-api-error.log"
echo "   pm2 logs"
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Happy Coding!${NC}"
echo "=========================================="
