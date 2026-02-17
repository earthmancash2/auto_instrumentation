# Quick Start Guide

This guide will help you get the Marketplace application running locally with Docker.

## Prerequisites

- **Docker** and **Docker Compose** installed
- That's it! No Node.js or other tools required.

## Starting the Application

### Option 1: Using Docker Compose (Recommended)

```bash
# Start all services
docker compose up

# Or run in background
docker compose up -d

# View logs
docker compose logs -f
```

### Option 2: Using Make

```bash
# Start all services
make up

# Start in background
make up-d

# View logs
make logs

# Stop services
make down
```

## First Run

On first run, the application will:
1. Build all Docker images (~2-3 minutes)
2. Start PostgreSQL and Redis
3. Run database migrations (create tables)
4. Seed 1000+ products with test data
5. Start all 3 backend services
6. Start the Next.js frontend

**Total startup time: ~3-5 minutes**

## Access Points

Once running, access:
- **Frontend**: http://localhost:3000
- **Core API**: http://localhost:3001/health
- **Search Service**: http://localhost:3002/health
- **Pricing Service**: http://localhost:3003/health

## Testing the Application

1. **Browse Products**: Visit http://localhost:3000
2. **View Product**: Click on any product
3. **Add to Cart**: Add items to cart (requires login - auto-created users)
4. **Search (Legacy)**: Try http://localhost:3000/search
5. **Checkout**: Complete a purchase (uses fake Stripe with 5% failure rate)

## Stopping the Application

```bash
# Stop all services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

## Troubleshooting

### Services won't start
```bash
# Rebuild images
docker compose build

# Clean start
docker compose down -v
docker compose up --build
```

### Database seed failed
```bash
# Manually trigger seed
docker compose exec core-api pnpm --filter database seed
```

### View service logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f core-api
docker compose logs -f web
```

## Development

To modify the code and see changes:

1. Code changes are automatically reflected via volume mounts
2. Backend services hot-reload with ts-node-dev
3. Frontend hot-reloads with Next.js dev mode

## What's Intentionally "Wrong"

This app includes realistic complexity for testing auto-instrumentation:

- ✅ Mixed Next.js routing (App + Pages Router)
- ✅ Inconsistent analytics naming (`product_viewed` vs `ProductViewed`)
- ✅ Service anti-patterns (direct database access)
- ✅ N+1 queries in order detail endpoint
- ✅ Race conditions in inventory management
- ✅ Bad seed data (orphaned records, negative prices)
- ✅ Multiple logging styles (console.log + Logger)
- ✅ Duplicate API endpoints
- ✅ Tech debt comments (TODO, FIXME)
- ✅ Legacy code alongside modern patterns

## Next Steps

Once the app is running, you can test your auto-instrumentation tools against this realistic codebase to generate event catalogs and track user flows.
