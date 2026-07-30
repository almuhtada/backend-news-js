# OS Command Comparison

Quick reference untuk command berbeda antara Ubuntu dan AlmaLinux.

## Package Management

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
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw reload
```

### AlmaLinux (firewalld)
```bash
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=3001/tcp
firewall-cmd --reload
```

---

## Services

### Both OS (same systemctl commands)
```bash
systemctl start docker
systemctl stop docker
systemctl restart docker
systemctl enable docker
systemctl status docker
journalctl -u docker -f
```

---

## Node.js Installation

### Ubuntu/Debian
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
node --version
npm --version
```

### AlmaLinux/RHEL
```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
dnf install -y nodejs
node --version
npm --version
```

---

## Docker Installation

### Both OS (Same - official script)
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable --now docker
```

---

## SELinux (AlmaLinux/RHEL Only)

```bash
# Check status
getenforce

# Temporary permissive
setenforce 0

# Permanent
nano /etc/selinux/config
# SELINUX=permissive
```

---

## User Management

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

# Add to docker group (both)
usermod -aG docker deploy
```

---

## Script Auto-Detection

Script `scripts/deployment/deploy-vps.sh` dan `scripts/deployment/setup-direct.sh` menangani:

- **Package Manager** - Automatically uses apt-get or dnf/yum
- **Firewall** - Configures UFW or firewalld accordingly
- **SELinux** - Handles SELinux only on RHEL-based systems
- **Node.js** - Uses correct repository (deb.nodesource or rpm.nodesource)
- **Docker** - Uses official script (works on all OS)
