# Docker Setup Guide for Blush Marketing

## Overview

This project includes Docker configurations for both development and production environments.

## Prerequisites

- Docker Desktop 4.0+ (or Docker Engine 20.10+)
- Docker Compose 2.0+
- At least 4GB RAM available for Docker
- At least 10GB free disk space

## Quick Start

### Development Mode (Hot Reload)

For development with hot-reload, run MongoDB in Docker and the app locally:

```bash
# Start MongoDB only
docker-compose -f docker-compose.dev.yml up -d

# Verify MongoDB is running
docker-compose -f docker-compose.dev.yml ps

# Run the app locally (with MongoDB connection string updated)
export MONGODB_URI="mongodb://admin:password@localhost:27017/blush-marketing?authSource=admin"
npm run dev
```

### Production Mode (Full Docker Stack)

For production-like environment with all services in containers:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

## Services

### MongoDB
- **Port**: 27017
- **Username**: admin
- **Password**: password
- **Database**: blush-marketing
- **Volume**: `mongodb_data` (persisted)

### Backend API
- **Port**: 3001
- **Health Check**: http://localhost:3001/api/health
- **Environment**: Production mode with optimized builds
- **Volumes**: `./storage` and `./logs` mounted to container

### Frontend
- **Port**: 3000
- **Health Check**: http://localhost:3000/health
- **Server**: nginx serving optimized React build
- **API Proxy**: All `/api/*` requests proxied to backend

## Docker Commands

### Build Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build backend

# Rebuild without cache
docker-compose build --no-cache
```

### Start Services

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up backend

# Start with logs following
docker-compose up -f
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### View Logs

```bash
# All services logs
docker-compose logs

# Specific service logs
docker-compose logs backend

# Follow logs
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Run Commands in Container

```bash
# Open shell in backend container
docker-compose exec backend sh

# Run npm command in backend
docker-compose exec backend npm run test

# Open MongoDB shell
docker-compose exec mongodb mongosh -u admin -p password
```

### Health Checks

```bash
# Check all service health
docker-compose ps

# Backend health
curl http://localhost:3001/api/health

# Frontend health
curl http://localhost:3000/health

# MongoDB health
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

## Volume Management

### List Volumes
```bash
docker volume ls
```

### Inspect Volume
```bash
docker volume inspect blush-marketing_mongodb_data
```

### Backup MongoDB Data
```bash
docker run --rm \
  -v blush-marketing_mongodb_data:/data \
  -v $(pwd)/backups:/backup \
  mongo:8.0-rc \
  tar czf /backup/mongodb-backup-$(date +%Y%m%d).tar.gz /data
```

### Restore MongoDB Data
```bash
docker run --rm \
  -v blush-marketing_mongodb_data:/data \
  -v $(pwd)/backups:/backup \
  mongo:8.0-rc \
  tar xzf /backup/mongodb-backup-YYYYMMDD.tar.gz -C /
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs [service-name]

# Check resource usage
docker stats

# Restart service
docker-compose restart [service-name]
```

### Port Already in Use

```bash
# Check what's using the port
lsof -i :3000
lsof -i :3001
lsof -i :27017

# Change ports in docker-compose.yml if needed
```

### MongoDB Connection Issues

```bash
# Check MongoDB is running
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Test connection from backend container
docker-compose exec backend node -e "console.log(require('mongoose').connection.readyState)"
```

### Out of Disk Space

```bash
# Clean up unused images
docker image prune -a

# Clean up unused containers
docker container prune

# Clean up unused volumes
docker volume prune

# Full system cleanup
docker system prune -a --volumes
```

### Build Failures

```bash
# Clear build cache
docker builder prune

# Rebuild without cache
docker-compose build --no-cache

# Check Docker disk space
docker system df
```

## Production Deployment

For production deployment:

1. **Update Environment Variables**:
   - Change default passwords in docker-compose.yml
   - Set secure MONGODB_URI
   - Configure API keys

2. **Use Secrets Manager**:
   - Consider using Docker secrets for sensitive data
   - Don't commit production docker-compose.yml with credentials

3. **Enable HTTPS**:
   - Add SSL/TLS termination
   - Use nginx with Let's Encrypt
   - Update nginx.conf for SSL

4. **Set Resource Limits**:
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '1'
             memory: 1G
           reservations:
             cpus: '0.5'
             memory: 512M
   ```

5. **Configure Backups**:
   - Set up automated MongoDB backups
   - Backup storage directory regularly
   - Document restore procedures

## Monitoring

### Container Resource Usage
```bash
docker stats
```

### Service Health Status
```bash
docker-compose ps
```

### View Container Logs
```bash
docker-compose logs -f --tail=100
```

## Development Workflow

1. **Make code changes** locally
2. **Test locally** with `npm run dev`
3. **Build Docker images** to test production-like environment
4. **Run full stack** with `docker-compose up`
5. **Push to production** after testing

## File Structure

```
.
├── Dockerfile                 # Backend production build
├── Dockerfile.frontend        # Frontend production build
├── docker-compose.yml         # Full stack (production)
├── docker-compose.dev.yml     # MongoDB only (development)
├── docker-compose.override.yml # Local overrides (gitignored)
├── .dockerignore             # Build exclusions
└── nginx.conf                # Frontend web server config
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Image](https://hub.docker.com/_/mongo)
- [Nginx Docker Image](https://hub.docker.com/_/nginx)
