# Deployment Configuration Files

This directory contains configuration files for deploying the Site Generator application on a Linux server.

## Files

- **site-generator.service** - Systemd service file for running the application as a service
- **nginx-site-generator.conf** - Nginx reverse proxy configuration
- **DEPLOYMENT.md** - Complete deployment guide with step-by-step instructions

## Quick Start

1. Copy `site-generator.service` to `/etc/systemd/system/`
2. Copy `nginx-site-generator.conf` to `/etc/nginx/sites-available/`
3. Follow the instructions in `DEPLOYMENT.md`

## Important Notes

- Update the `server_name` in the Nginx config with your actual domain
- Update paths in the systemd service file if your application is in a different location
- Ensure the user/group in the systemd file matches your server setup (default: www-data)
- Configure SSL certificates for production use
