# OS Support Documentation

Script deployment mendukung **auto-detection** untuk berbagai distro Linux.

## Supported Operating Systems

### Debian-based (apt)
- **Ubuntu** 20.04, 22.04, 24.04
- **Debian** 11, 12

### RHEL-based (dnf/yum)
- **AlmaLinux** 8, 9
- **Rocky Linux** 8, 9
- **RHEL** 8, 9
- **CentOS** Stream 8, 9
- **Fedora** 38+

---

## Auto-Detection Deployment

Script di `scripts/deployment/` akan **otomatis mendeteksi OS** dan menjalankan command yang sesuai:

```bash
# Deploy menggunakan script
bash scripts/deployment/deploy-vps.sh
# atau langsung di VPS
bash scripts/deployment/setup-direct.sh
```

**Yang dilakukan script:**
1. Deteksi OS otomatis (Ubuntu/Debian/AlmaLinux/RHEL/etc)
2. Install Docker dengan package manager yang tepat
3. Install Docker Compose
4. Install Node.js & PM2
5. Setup firewall (UFW atau firewalld)
6. Handle SELinux (untuk RHEL-based)

---

## Manual Setup per OS

### Ubuntu/Debian

```bash
ssh deploy@vps
cd /var/www/almuhtada/backend-news-js
bash scripts/deployment/setup-ubuntu.sh
```

**Package Manager:** `apt-get`
**Firewall:** `ufw`
**SELinux:** Tidak ada

### AlmaLinux/RHEL/Rocky

```bash
ssh deploy@vps
cd /var/www/almuhtada/backend-news-js
bash scripts/deployment/setup-almalinux.sh
```

**Package Manager:** `dnf` (AlmaLinux 8+) atau `yum` (lama)
**Firewall:** `firewalld`
**SELinux:** Ya (script akan handle)

---

## OS Detection

Script menggunakan `/etc/os-release` untuk deteksi:

```bash
cat /etc/os-release
# Output contoh Ubuntu:
# ID=ubuntu
# VERSION_ID="22.04"
# Output contoh AlmaLinux:
# ID="almalinux"
# VERSION_ID="9.3"
```

---

## Perbedaan Instalasi per OS

### Package Manager

| OS | Package Manager | Update Command |
|---|---|---|
| Ubuntu/Debian | apt-get | `apt-get update && apt-get upgrade -y` |
| AlmaLinux 8+ | dnf | `dnf update -y` |
| CentOS 7/RHEL 7 | yum | `yum update -y` |

### Firewall

| OS | Firewall | Commands |
|---|---|---|
| Ubuntu/Debian | ufw | `ufw allow 'Nginx Full'` |
| AlmaLinux/RHEL | firewalld | `firewall-cmd --add-service=http` |

### SELinux

**Ubuntu/Debian:** Tidak ada SELinux

**AlmaLinux/RHEL:** SELinux enabled by default

```bash
# Cek status
getenforce
# Set permissive
setenforce 0
# Disable permanent
nano /etc/selinux/config
# SELINUX=permissive
```

---

## Comparison Table

| Feature | Ubuntu/Debian | AlmaLinux/RHEL |
|---------|---------------|----------------|
| Package Manager | apt-get | dnf/yum |
| Firewall | ufw | firewalld |
| SELinux | Tidak ada | Ada |
| Docker Support | Excellent | Excellent |
| Recommended for | Beginners | Enterprise |

## Recommendations

### Untuk Pemula
- **Ubuntu 22.04 LTS** - Paling banyak dokumentasi
- Simple firewall (ufw)
- Tidak perlu handle SELinux

### Untuk Enterprise
- **AlmaLinux 9** - Free RHEL alternative
- SELinux untuk security
- Commercial support available

### Untuk Stability
- **Debian 12** - Very stable
- **Rocky Linux 9** - RHEL compatible
