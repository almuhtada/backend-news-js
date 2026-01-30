# 🔄 OS Command Comparison

Quick reference untuk command berbeda antara Ubuntu dan AlmaLinux.

## Package Management

### Update System

| Task | Ubuntu/Debian | AlmaLinux/RHEL |
|------|---------------|----------------|
| Update packages | `apt-get update` | `dnf update -y` |
| Upgrade system | `apt-get upgrade -y` | `dnf upgrade -y` |
| Install package | `apt-get install -y git` | `dnf install -y git` |
| Remove package | `apt-get remove git` | `dnf remove git` |
| Clean cache | `apt-get clean` | `dnf clean all` |

---

## Firewall

### Ubuntu (UFW)

```bash
# Enable
ufw --force enable

# Allow port
ufw allow 3001/tcp

# Check status
ufw status

# Reload
ufw reload

# Delete rule
ufw delete allow 3001/tcp
```

### AlmaLinux (firewalld)

```bash
# Enable
systemctl enable --now firewalld

# Allow port
firewall-cmd --permanent --add-port=3001/tcp

# Check status
firewall-cmd --list-all

# Reload
firewall-cmd --reload

# Delete rule
firewall-cmd --permanent --remove-port=3001/tcp
```

---

## Services

### Ubuntu/Debian

```bash
# Start service
systemctl start docker

# Stop service
systemctl stop docker

# Restart service
systemctl restart docker

# Enable on boot
systemctl enable docker

# Check status
systemctl status docker

# View logs
journalctl -u docker -f
```

### AlmaLinux/RHEL

```bash
# Same commands!
# systemctl is same on both

# Additional SELinux consideration
systemctl status docker
getenforce  # Check SELinux mode
```

---

## Node.js Installation

### Ubuntu/Debian

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

# Install Node.js
apt-get install -y nodejs

# Verify
node --version
npm --version
```

### AlmaLinux/RHEL

```bash
# Add NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -

# Install Node.js
dnf install -y nodejs

# Verify
node --version
npm --version
```

---

## Docker Installation

### Both OS (Same)

```bash
# Install Docker (official script detects OS automatically)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Start Docker
systemctl enable --now docker

# Verify
docker --version
```

---

## Docker Compose Installation

### Both OS (Same)

```bash
# Get latest version
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)

# Download
curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
chmod +x /usr/local/bin/docker-compose

# Verify
docker-compose --version
```

---

## SELinux (AlmaLinux/RHEL Only)

### Check Status

```bash
# Check current mode
getenforce

# Possible outputs:
# - Enforcing (strict mode)
# - Permissive (warnings only)
# - Disabled (SELinux off)
```

### Change Mode

```bash
# Temporary (until reboot)
setenforce 0        # Set permissive
setenforce 1        # Set enforcing

# Permanent (edit config)
nano /etc/selinux/config

# Set one of:
SELINUX=enforcing
SELINUX=permissive
SELINUX=disabled
```

### Allow Docker/App Connections

```bash
# Allow httpd to connect to network
setsebool -P httpd_can_network_connect 1

# Allow custom port 3001
semanage port -a -t http_port_t -p tcp 3001

# Set file contexts
semanage fcontext -a -t httpd_sys_content_t "/var/www/news-backend(/.*)?"
restorecon -Rv /var/www/news-backend
```

### Ubuntu (No SELinux)

```bash
# Ubuntu doesn't have SELinux
# AppArmor is used instead (usually no config needed for Docker)
```

---

## User Management

### Both OS (Same)

```bash
# Create user
useradd -m -s /bin/bash deploy

# Set password
passwd deploy

# Add to sudo group
# Ubuntu:
usermod -aG sudo deploy

# AlmaLinux:
usermod -aG wheel deploy

# Add to docker group
usermod -aG docker deploy
```

---

## Network Configuration

### Ubuntu/Debian (netplan)

```bash
# Config file
nano /etc/netplan/01-netcfg.yaml

# Apply
netplan apply

# Check IP
ip addr show
```

### AlmaLinux/RHEL (NetworkManager)

```bash
# Config file
nano /etc/sysconfig/network-scripts/ifcfg-eth0

# Restart network
systemctl restart NetworkManager

# Check IP
ip addr show
```

---

## Our Auto-Detection Script Handles

✅ **Package Manager** - Automatically uses apt-get or dnf/yum
✅ **Firewall** - Configures UFW or firewalld accordingly
✅ **SELinux** - Handles SELinux only on RHEL-based systems
✅ **Node.js** - Uses correct repository (deb.nodesource or rpm.nodesource)
✅ **Docker** - Uses official script (works on all OS)

---

## Quick Command Translation

| Action | Ubuntu | AlmaLinux |
|--------|--------|-----------|
| Install package | `apt install` | `dnf install` |
| Update system | `apt update` | `dnf update` |
| Open port 3001 | `ufw allow 3001/tcp` | `firewall-cmd --add-port=3001/tcp` |
| Check firewall | `ufw status` | `firewall-cmd --list-all` |
| Add to sudo | `usermod -aG sudo user` | `usermod -aG wheel user` |
| Network config | netplan | NetworkManager |
| SELinux | ❌ Not available | ✅ `getenforce` |

---

## Testing Script Detection

Jalankan di VPS untuk test OS detection:

```bash
cat > /tmp/test-os.sh << 'EOF'
#!/bin/bash

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "================================"
    echo "OS Detection Test"
    echo "================================"
    echo "OS ID: $ID"
    echo "Version: $VERSION_ID"
    echo "Name: $PRETTY_NAME"
    echo ""

    # Determine package manager
    if command -v apt-get &> /dev/null; then
        echo "Package Manager: apt-get"
    elif command -v dnf &> /dev/null; then
        echo "Package Manager: dnf"
    elif command -v yum &> /dev/null; then
        echo "Package Manager: yum"
    fi

    # Check firewall
    if command -v ufw &> /dev/null; then
        echo "Firewall: ufw"
    elif command -v firewall-cmd &> /dev/null; then
        echo "Firewall: firewalld"
    fi

    # Check SELinux
    if command -v getenforce &> /dev/null; then
        echo "SELinux: $(getenforce)"
    else
        echo "SELinux: Not available"
    fi
fi
EOF

bash /tmp/test-os.sh
```

---

## Kesimpulan

**Script deployment kami support SEMUA distro di atas dengan auto-detection!**

Anda tidak perlu khawatir tentang perbedaan command - script akan handle semuanya otomatis. 🎉

Untuk manual setup OS-specific, gunakan:
- `setup-ubuntu.sh` untuk Ubuntu/Debian
- `setup-almalinux.sh` untuk AlmaLinux/RHEL

Atau gunakan `deploy-vps.sh` yang akan auto-detect! ⚡
