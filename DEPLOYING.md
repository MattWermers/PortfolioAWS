# Deploying & Restarting mattwermers.me

The site runs on an AWS EC2 instance and is composed of two services:

| Service | Role |
|---------|------|
| **Nginx** | Reverse proxy / TLS termination |
| **Gunicorn** | Serves the Flask app (`/wfd` and '/dwplus' routes) |

The Jekyll static site is compiled and served directly from `/var/www/portfolio` via Nginx.

---

## 1. Pull latest changes

```bash
cd ~/web/Portfolio
git pull
```

---

## 2. Rebuild & deploy the Jekyll static site

Run the build script from the repo root. It compiles the Jekyll site and copies
the output to `/var/www/portfolio`.

```bash
./build_and_deploy.sh
```

> **Note:** The script uses `sudo` internally for write access to `/var/www/portfolio`.
> Make sure your user has the necessary sudo permissions.

---

## 3. Restart the Flask / Gunicorn service

```bash
# Kill the existing Gunicorn process
pkill gunicorn

# Activate the virtual environment
cd flask/
source .venv/bin/activate

# Start Gunicorn (persists after logout)
nohup gunicorn -w 2 -b 127.0.0.1:5000 app:app &
```

Verify it's running:

```bash
ps aux | grep gunicorn
```

---

## 4. Restart Nginx (if config changed)

```bash
# Test config for syntax errors first
sudo nginx -t

# Reload without dropping connections
sudo systemctl reload nginx

# Or do a full restart if needed
sudo systemctl restart nginx
```

---

## Quick reference — full restart sequence

```bash
cd ~/web/Portfolio
git pull
./build_and_deploy.sh
pkill gunicorn
cd flask && source .venv/bin/activate
nohup gunicorn -w 2 -b 127.0.0.1:5000 app:app &
```

---

## Checking service health

```bash
# Nginx status
sudo systemctl status nginx

# Active Gunicorn processes
ps aux | grep gunicorn

# Tail Gunicorn access log (nohup.out in flask/ by default)
tail -f ~/web/Portfolio/flask/nohup.out
```
