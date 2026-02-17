# Marketplace Auto-Instrumentation Test Harness

A realistic e-commerce marketplace application (like Etsy) built intentionally with complexity, tech debt, and anti-patterns found in real-world production applications. This serves as a test harness for auto-instrumentation tools.

## 🎯 Purpose

This is **NOT** a clean, easy-to-instrument demo. This application includes:
- Mixed Next.js routing patterns (App Router + Pages Router)
- Multiple microservices with messy boundaries
- Inconsistent code patterns and naming conventions
- Performance issues (N+1 queries)
- Bad data in the database
- Tech debt markers and deprecated code
- Multiple state management approaches

**Goal**: Test auto-instrumentation tools against a realistic application to generate comprehensive event catalogs.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14+ (TypeScript)
- **Backend**: 3 Node.js microservices
- **Database**: PostgreSQL (shared anti-pattern)
- **Cache**: Redis
- **Monorepo**: pnpm workspaces + Turbo
- **UI**: Shadcn/UI + Tailwind CSS

### Services
- **Core API** (port 3001): Main API - auth, products, orders, cart
- **Search Service** (port 3002): Product search with full-text search
- **Pricing Service** (port 3003): Dynamic pricing and inventory management
- **Frontend** (port 3000): Next.js application with mixed routing

## 🚀 Quick Start

**Prerequisites**: Docker and Docker Compose only (no Node.js or pnpm required)

```bash
# Start the entire stack
docker compose up

# Or run in background
docker compose up -d

# View logs
docker compose logs -f

# Stop everything
docker compose down
```

**First run takes ~2-3 minutes** to:
- Build all service images
- Start Postgres and Redis
- Run database migrations
- Seed 1000+ products with test data
- Start all services

### Access Points
- Frontend: http://localhost:3000
- Core API: http://localhost:3001
- Search Service: http://localhost:3002
- Pricing Service: http://localhost:3003
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## 📁 Project Structure

```
auto_instrumentation/
├── packages/
│   ├── shared/              # Shared types, utils, fake 3P integrations
│   └── database/            # Schema, migrations, seeds
├── services/
│   ├── core-api/            # Main API service
│   ├── search-service/      # Search microservice
│   └── pricing-service/     # Pricing/inventory service
└── apps/
    └── marketplace-web/     # Next.js frontend (App + Pages Router)
```

## 🧪 Testing Flows

After starting with `docker compose up`, test these scenarios:

1. **Full Purchase Flow**
   - Browse products → Add to cart → Checkout → Order confirmation
   - Verifies: Analytics events, Stripe stub, email stub, order creation

2. **Search Flow** (Legacy Pages Router)
   - Search page → Results → Product detail
   - Verifies: Search service, Redis caching

3. **Seller Dashboard**
   - Login → Dashboard → Create product → View product
   - Verifies: Product creation, search indexing

## 🐛 Intentional Issues

This app includes realistic complexity that challenges auto-instrumentation:

- **Mixed rendering**: SSR, CSR, Server Components, Server Actions, ISR
- **Service anti-patterns**: Direct database access across service boundaries
- **Inconsistent naming**: `product_viewed` vs `ProductViewed` vs `product-view`
- **N+1 queries**: Order detail endpoint intentionally inefficient
- **Race conditions**: Inventory management has timing issues
- **Bad data**: Orphaned records, missing fields, invalid references
- **Duplicate endpoints**: Same functionality in multiple routing strategies
- **Multiple state patterns**: Zustand, Context, local state, unused Redux
- **Tech debt**: TODO comments, feature flags, commented code

## 🔧 Development (Local)

If you prefer local development without Docker:

```bash
# Install dependencies
pnpm install

# Start Postgres and Redis
docker compose up postgres redis -d

# Run migrations and seeds
pnpm db:migrate
pnpm db:seed

# Start all services in dev mode
pnpm dev
```

## 📊 Database

Single PostgreSQL database (realistic anti-pattern):
- 1000+ products (with 5% orphaned sellers, 10% missing descriptions)
- 100 buyers, 50 sellers
- 500 historical orders
- Intentional bad data for testing

## 🎨 UI Components

Uses Shadcn/UI for a polished, modern design with:
- Product cards and listings
- Shopping cart widget
- Checkout flow
- Seller dashboard
- Search interface

## 📝 License

MIT - This is a test harness for instrumentation tools.
