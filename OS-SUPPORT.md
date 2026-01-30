# 🐧 OS Support Documentation

Script deployment mendukung **auto-detection** untuk berbagai distro Linux.

## ✅ Supported Operating Systems

### Debian-based (apt)
- ✅ **Ubuntu** 20.04, 22.04, 24.04
- ✅ **Debian** 11, 12

### RHEL-based (dnf/yum)
- ✅ **AlmaLinux** 8, 9
- ✅ **Rocky Linux** 8, 9
- ✅ **RHEL** 8, 9
- ✅ **CentOS** Stream 8, 9
- ✅ **Fedora** 38+

---

## 🚀 Auto-Detection Deployment

Script `deploy-vps.sh` akan **otomatis mendeteksi OS** dan menjalankan command yang sesuai:

```bash
# Edit konfigurasi VPS
nano deploy-vps.sh
# Ubah: VPS_USER, VPS_HOST

# Deploy (auto-detect OS)
bash deploy-vps.sh
```

**Yang dilakukan script:**
1. ✅ Deteksi OS otomatis (Ubuntu/Debian/AlmaLinux/RHEL/etc)
2. ✅ Install Docker dengan package manager yang tepat
3. ✅ Install Docker Compose
4. ✅ Install Node.js & PM2
5. ✅ Setup firewall (UFW atau firewalld)
6. ✅ Handle SELinux (untuk RHEL-based)
7. ✅ Upload aplikasi
8. ✅ Start containers

---

## 📋 Manual Setup per OS

### Ubuntu/Debian

```bash
# Upload script
scp setup-ubuntu.sh root@your-vps:/tmp/

# SSH ke VPS
ssh root@your-vps

# Jalankan setup
bash /tmp/setup-ubuntu.sh
```

**Package Manager:** `apt-get`
**Firewall:** `ufw`
**SELinux:** Tidak ada

### AlmaLinux/RHEL/Rocky

```bash
# Upload script
scp setup-almalinux.sh root@your-vps:/tmp/

# SSH ke VPS
ssh root@your-vps

# Jalankan setup
bash /tmp/setup-almalinux.sh
```

**Package Manager:** `dnf` (AlmaLinux 8+) atau `yum` (lama)
**Firewall:** `firewalld`
**SELinux:** Ya (script akan handle)

---

## 🔍 OS Detection

Script menggunakan `/etc/os-release` untuk deteksi:

```bash
# Cek OS Anda
cat /etc/os-release

# Output contoh Ubuntu:
ID=ubuntu
VERSION_ID="22.04"

# Output contoh AlmaLinux:
ID="almalinux"
VERSION_ID="9.3"
```

---

## 🛠️ Perbedaan Instalasi per OS

### Package Manager

| OS | Package Manager | Update Command |
|---|---|---|
| Ubuntu/Debian | apt-get | `apt-get update && apt-get upgrade -y` |
| AlmaLinux 8+ | dnf | `dnf update -y` |
| CentOS 7/RHEL 7 | yum | `yum update -y` |

### Firewall

| OS | Firewall | Commands |
|---|---|---|
| Ubuntu/Debian | ufw | `ufw allow 3001/tcp` |
| AlmaLinux/RHEL | firewalld | `firewall-cmd --add-port=3001/tcp` |

### SELinux

**Ubuntu/Debian:** Tidak ada SELinux

**AlmaLinux/RHEL:** SELinux enabled by default

Script akan:
- Set ke **permissive** mode (recommended untuk testing)
- Atau biarkan **enforcing** (perlu config manual)
- Atau **disable** permanently (not recommended)

```bash
# Cek status SELinux
getenforce

# Set permissive
setenforce 0

# Disable permanent (edit config)
nano /etc/selinux/config
# SELINUX=disabled
```

**Untuk production dengan SELinux enforcing:**
```bash
# Allow network connect untuk httpd/nginx
setsebool -P httpd_can_network_connect 1

# Allow port 3001
semanage port -a -t http_port_t -p tcp 3001

# Set context untuk app directory
semanage fcontext -a -t httpd_sys_content_t "/var/www/news-backend(/.*)?"
restorecon -Rv /var/www/news-backend
```

---

## 🐳 Docker Installation

Docker menggunakan official script yang support semua distro:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

Script ini akan:
- Detect OS otomatis
- Add Docker repository yang sesuai
- Install Docker Engine
- Start dan enable Docker service

---

## 📦 Node.js Installation

### Ubuntu/Debian (NodeSource)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
```

### AlmaLinux/RHEL (NodeSource)

```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
dnf install -y nodejs
```

---

## 🔥 Firewall Configuration

### UFW (Ubuntu/Debian)

```bash
# Enable UFW
ufw --force enable

# Allow ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3001/tcp  # Backend API

# Check status
ufw status

# Reload
ufw reload
```

### firewalld (AlmaLinux/RHEL)

```bash
# Start firewalld
systemctl start firewalld
systemctl enable firewalld

# Allow services
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https

# Allow custom port
firewall-cmd --permanent --add-port=3001/tcp

# Reload
firewall-cmd --reload

# Check status
firewall-cmd --list-all
```

---

## 🧪 Testing OS Detection

Test script detection tanpa install:

```bash
# Upload test script ke VPS
cat > /tmp/test-os.sh << 'EOF'
#!/bin/bash
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "OS: $ID"
    echo "Version: $VERSION_ID"
    echo "Name: $PRETTY_NAME"
fi
EOF

# Run test
bash /tmp/test-os.sh
```

---

## 🔧 Troubleshooting per OS

### Ubuntu/Debian Issues

**Docker permission denied:**
```bash
usermod -aG docker $USER
newgrp docker
```

**UFW blocking Docker:**
```bash
# Add to /etc/ufw/after.rules
nano /etc/ufw/after.rules
# Add Docker rules, then:
ufw reload
```

### AlmaLinux/RHEL Issues

**SELinux blocking Docker:**
```bash
# Temporary
setenforce 0

# Permanent
nano /etc/selinux/config
# SELINUX=permissive
```

**firewalld blocking connections:**
```bash
# Check active zones
firewall-cmd --get-active-zones

# Check rules
firewall-cmd --list-all

# Add port
firewall-cmd --permanent --add-port=3001/tcp
firewall-cmd --reload
```

**Docker not starting:**
```bash
# Check status
systemctl status docker

# Check logs
journalctl -u docker -f

# Restart
systemctl restart docker
```

---

## 📊 Comparison Table

| Feature | Ubuntu/Debian | AlmaLinux/RHEL |
|---------|---------------|----------------|
| Package Manager | apt-get | dnf/yum |
| Firewall | ufw | firewalld |
| SELinux | ❌ No | ✅ Yes |
| Docker Support | ✅ Excellent | ✅ Excellent |
| Auto-detection | ✅ Yes | ✅ Yes |
| Recommended for | Beginners | Enterprise |

---

## 🎯 Recommendations

### Untuk Pemula
- ✅ **Ubuntu 22.04 LTS** - Paling banyak dokumentasi
- ✅ Simple firewall (ufw)
- ✅ Tidak perlu handle SELinux

### Untuk Enterprise
- ✅ **AlmaLinux 9** - Free RHEL alternative
- ✅ Long-term support
- ✅ SELinux untuk security
- ✅ Commercial support available

### Untuk Stability
- ✅ **Debian 12** - Very stable
- ✅ **Rocky Linux 9** - RHEL compatible

---

## 🚦 Quick Start per OS

### Ubuntu 22.04

```bash
# Update system
apt-get update && apt-get upgrade -y

# Run auto-setup
bash deploy-vps.sh
```

### AlmaLinux 9

```bash
# Update system
dnf update -y

# Run auto-setup
bash deploy-vps.sh
```

Script akan handle sisanya secara otomatis! 🎉

---

## 📝 Notes

1. **All scripts support both OS families** - Auto-detection built-in
2. **Docker sama di semua OS** - Menggunakan official Docker script
3. **Firewall berbeda** - Script akan pilih yang sesuai (ufw/firewalld)
4. **SELinux only on RHEL-based** - Auto-handled oleh script
5. **PM2 sama di semua OS** - Installed via npm

---

## 🔗 Official Documentation

- [Docker on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Docker on AlmaLinux](https://docs.docker.com/engine/install/centos/)
- [AlmaLinux Wiki](https://wiki.almalinux.org/)
- [Ubuntu Server Guide](https://ubuntu.com/server/docs)
- [SELinux Guide](https://www.redhat.com/en/topics/linux/what-is-selinux)

---

Semua script sudah **tested dan siap pakai** untuk kedua OS! 🚀
