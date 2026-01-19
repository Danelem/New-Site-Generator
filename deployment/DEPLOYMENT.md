# Deployment Guide

This guide covers deploying the Site Generator application on a Linux server using systemd and Nginx.

## Prerequisites

- Ubuntu/Debian Linux server (or similar)
- Node.js 18.x or higher installed
- Nginx installed
- Domain name configured (optional, for production)
- Root or sudo access

## Step 1: Install Dependencies

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt install nginx -y

# Install PM2 (optional, alternative to systemd)
# npm install -g pm2
```

## Step 2: Deploy Application Files

```bash
# Create application directory
sudo mkdir -p /var/www/site-generator
sudo chown -R $USER:$USER /var/www/site-generator

# Clone or copy your application files to /var/www/site-generator
# If using git:
cd /var/www/site-generator
git clone https://github.com/BerkeZavaro/New-Site-Generator.git .

# Or use rsync/scp to copy files from your local machine
```

## Step 3: Install Application Dependencies

```bash
cd /var/www/site-generator
npm install --production
```

**Note**: You may see deprecation warnings during installation (ESLint 8, rimraf, glob, etc.). These are expected and safe to ignore. See `DEPRECATION_WARNINGS.md` for details.

## Step 4: Configure Environment Variables

```bash
# Copy the example env file
cp env.example .env.local

# Edit the environment file
nano .env.local

# Add your configuration:
# GOOGLE_AI_API_KEY=your-actual-api-key
# PORT=3000
```

## Step 5: Build the Application

```bash
cd /var/www/site-generator
npm run build
```

## Step 6: Configure Systemd Service

```bash
# Copy the systemd service file
sudo cp deployment/site-generator.service /etc/systemd/system/

# Edit the service file if needed (update paths, user, etc.)
sudo nano /etc/systemd/system/site-generator.service

# Reload systemd
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable site-generator

# Start the service
sudo systemctl start site-generator

# Check service status
sudo systemctl status site-generator

# View logs
sudo journalctl -u site-generator -f
```

### Systemd Service Management

```bash
# Start service
sudo systemctl start site-generator

# Stop service
sudo systemctl stop site-generator

# Restart service
sudo systemctl restart site-generator

# View logs
sudo journalctl -u site-generator -n 50
sudo journalctl -u site-generator -f

# Check status
sudo systemctl status site-generator
```

## Step 7: Configure Nginx

```bash
# Copy the Nginx configuration
sudo cp deployment/nginx-site-generator.conf /etc/nginx/sites-available/site-generator

# Edit the configuration file
sudo nano /etc/nginx/sites-available/site-generator

# Update the server_name with your domain
# Replace 'your-domain.com' with your actual domain

# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/site-generator /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 8: Configure Firewall

```bash
# Allow HTTP and HTTPS traffic
sudo ufw allow 'Nginx Full'
# Or individually:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall (if not already enabled)
sudo ufw enable

# Check firewall status
sudo ufw status
```

## Step 9: Set Up SSL Certificate (Optional but Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certbot will automatically configure Nginx for HTTPS
# After setup, uncomment the HTTPS server block in the Nginx config
```

## Step 10: Set File Permissions

```bash
# Set proper ownership
sudo chown -R www-data:www-data /var/www/site-generator

# Set proper permissions
sudo chmod -R 755 /var/www/site-generator

# Protect .env.local
sudo chmod 600 /var/www/site-generator/.env.local
```

## Troubleshooting

### Application Not Starting

1. Check systemd logs:
   ```bash
   sudo journalctl -u site-generator -n 50
   ```

2. Verify environment variables:
   ```bash
   sudo systemctl show site-generator | grep Environment
   ```

3. Test the application manually:
   ```bash
   cd /var/www/site-generator
   sudo -u www-data npm start
   ```

### Nginx Not Working

1. Check Nginx configuration:
   ```bash
   sudo nginx -t
   ```

2. Check Nginx error logs:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/site-generator-error.log
   ```

3. Verify the application is running:
   ```bash
   curl http://localhost:3000
   ```

### Port Already in Use

If port 3000 is already in use:

1. Change the PORT in `.env.local`
2. Update the Nginx config to use the new port
3. Restart both services:
   ```bash
   sudo systemctl restart site-generator
   sudo systemctl reload nginx
   ```

## Updating the Application

```bash
# Navigate to application directory
cd /var/www/site-generator

# Pull latest changes (if using git)
git pull origin main

# Install new dependencies
npm install --production

# Rebuild the application
npm run build

# Restart the service
sudo systemctl restart site-generator
```

## Monitoring

### View Application Logs
```bash
# Real-time logs
sudo journalctl -u site-generator -f

# Last 100 lines
sudo journalctl -u site-generator -n 100
```

### View Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/site-generator-access.log

# Error logs
sudo tail -f /var/log/nginx/site-generator-error.log
```

### Check Service Status
```bash
# Application service
sudo systemctl status site-generator

# Nginx service
sudo systemctl status nginx
```

## Security Considerations

1. **Keep dependencies updated**: Regularly run `npm audit` and update packages
2. **Use HTTPS**: Always use SSL certificates in production
3. **Firewall**: Only open necessary ports (80, 443)
4. **Environment variables**: Never commit `.env.local` to version control
5. **File permissions**: Ensure proper file ownership and permissions
6. **Regular updates**: Keep the system and Node.js updated

## Performance Optimization

1. **Enable Nginx caching** (add to Nginx config):
   ```nginx
   proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=site_cache:10m max_size=100m;
   
   location / {
       proxy_cache site_cache;
       proxy_cache_valid 200 60m;
       # ... other proxy settings
   }
   ```

2. **Enable gzip compression** (add to Nginx config):
   ```nginx
   gzip on;
   gzip_vary on;
   gzip_min_length 1024;
   gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
   ```

3. **Monitor resources**:
   ```bash
   # Check memory usage
   free -h
   
   # Check CPU usage
   top
   
   # Check disk usage
   df -h
   ```
