# Testing & Verification Guide

This document outlines how to test the Marketplace application and verify all intentional complexity is working as expected.

## Prerequisites

Start the application:
```bash
docker compose up
```

Wait for all services to be healthy (~3-5 minutes on first run).

## Test Scenarios

### 1. Full Purchase Flow

**Purpose**: Test the complete e-commerce flow from browsing to checkout

**Steps**:
1. Visit http://localhost:3000
2. Browse featured products on homepage
3. Click on a product to view details
4. Add product to cart (1-2 items)
5. Navigate to /cart
6. Review cart items
7. Click "Proceed to Checkout"
8. Fill in shipping address
9. Enter card info (last 4 digits: any 4 numbers)
10. Submit order

**Expected**:
- Order completes successfully (~95% success rate)
- OR Payment fails with error (~5% due to Stripe stub)
- Analytics events fire for: product_viewed, add_to_cart, checkout_started, purchase
- Console shows inconsistent event naming
- Email stub logs order confirmation
- Cart is cleared after successful order

**Verify Analytics Inconsistency**:
- Check browser console for mixed event names
- Should see: `product_viewed`, `AddedToCart`, `checkout_started`, `purchase`

### 2. Search Flow (Legacy Pages Router)

**Purpose**: Test legacy search implementation with getServerSideProps

**Steps**:
1. Visit http://localhost:3000/search
2. Enter search query (e.g., "electronics")
3. Submit search
4. Review results

**Expected**:
- Search service is called (check logs: `docker compose logs search-service`)
- Results are cached in Redis
- Search page uses Pages Router (check source for `__NEXT_DATA__`)
- Different from App Router implementation

**Verify**:
```bash
# Check search service logs
docker compose logs search-service | grep "Search performed"

# Check Redis cache
docker compose exec redis redis-cli keys "search:*"
```

### 3. Service Communication & Anti-Patterns

**Purpose**: Verify service anti-patterns are present

**Steps**:
1. Create an order (follow purchase flow)
2. Monitor service logs

**Verify Anti-Patterns**:
```bash
# Search service directly accesses Core DB (anti-pattern)
docker compose logs search-service | grep "Indexed product"

# Pricing service mixes HTTP calls and direct DB access
docker compose logs pricing-service | grep "database directly"

# Core API has N+1 queries
docker compose logs core-api | grep "Get Product Error"
```

**Expected Anti-Patterns**:
- Search service: Direct writes to `product_search_index` table
- Pricing service: Sometimes calls API, sometimes queries DB
- Core API: N+1 queries when fetching order details

### 4. Race Conditions (Inventory)

**Purpose**: Demonstrate concurrency issues in inventory management

**Steps**:
1. Find a product ID from the database
2. Make concurrent reservation requests

```bash
# Get a product ID
docker compose exec postgres psql -U marketplace -d marketplace -c "SELECT id FROM products LIMIT 1;"

# Make concurrent requests (replace PRODUCT_ID)
for i in {1..5}; do
  curl -X POST http://localhost:3003/api/inventory/PRODUCT_ID/reserve \
    -H "Content-Type: application/json" \
    -d '{"quantity": 10}' &
done
```

**Expected**:
- Some requests may over-reserve stock due to race condition
- No optimistic locking or transactions
- Check inventory table for inconsistencies

### 5. Mixed Routing Patterns

**Purpose**: Verify both App Router and Pages Router coexist

**App Router Pages**:
- `/` - Homepage (Server Component)
- `/products` - Product listing (Server Component)
- `/products/[id]` - Product detail (Client Component)
- `/cart` - Cart (Client Component with Zustand)
- `/checkout` - Checkout (Client Component)

**Pages Router Pages**:
- `/search` - Search (getServerSideProps)
- `/orders/[id]` - Order detail (getStaticProps + ISR)
- `/api/products/[id]` - API route (duplicate)
- `/api/search` - Search API (duplicate)

**Verify**:
- View page source of `/` vs `/search`
- App Router: Uses React Server Components
- Pages Router: Uses traditional SSR with `__NEXT_DATA__`

### 6. Analytics Inconsistency

**Purpose**: Verify manual analytics with inconsistent naming

**Expected Event Names**:
- `product_viewed` OR `ProductViewed` OR `product-view`
- `add_to_cart` OR `AddedToCart` OR `product_added_to_cart`
- `checkout_started` OR `CheckoutInitiated`
- `purchase` OR `order_completed` OR `OrderComplete`
- `search` OR `search_performed` OR `SearchQuery`

**Check Console**:
```javascript
// Open browser console on product page
// Should see multiple tracking calls with different formats
```

### 7. Database Issues

**Purpose**: Verify intentional bad data exists

**Check Bad Data**:
```bash
# Connect to database
docker compose exec postgres psql -U marketplace -d marketplace

# Check for products with negative prices
SELECT id, title, price FROM products WHERE price < 0 LIMIT 5;

# Check for products with missing descriptions
SELECT id, title, description FROM products WHERE description IS NULL LIMIT 5;

# Check orphaned order items (if any)
SELECT oi.* FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
WHERE p.id IS NULL LIMIT 5;

# Check negative inventory
SELECT * FROM inventory WHERE available_stock < 0 LIMIT 5;

# Check inconsistent analytics events
SELECT DISTINCT event_name FROM analytics_events;
```

**Expected**:
- ~3% products with negative prices
- ~10% products with NULL descriptions
- Some orphaned records
- Negative inventory values
- Mixed event naming in analytics_events table

### 8. Performance Issues

**Purpose**: Identify intentional performance problems

**N+1 Query in Order Detail**:
```bash
# Enable query logging
docker compose logs core-api | grep "SELECT.*products WHERE id"

# Fetch an order detail
# Should see multiple sequential product queries instead of one JOIN
```

**Slow Analytics Queries**:
```sql
-- No indexes on analytics_events table
EXPLAIN SELECT * FROM analytics_events WHERE event_name = 'product_viewed';
-- Should show Seq Scan (slow)
```

### 9. Tech Debt Markers

**Verify Tech Debt Exists**:
- TODO comments in codebase
- Feature flag `USE_NEW_CHECKOUT`
- Duplicate routes: `/checkout` and `/checkout-old`
- Unused Redux slice file
- Legacy CSS file still referenced
- Mixed logging (console.log + Logger)
- Commented-out code blocks

### 10. 3P Integrations (Stubs)

**Verify Fake Integrations**:
- **Stripe**: Check for payment failures (~5% rate)
- **SendGrid**: Check logs for email sending
- **Analytics**: Check console for tracking calls
- **Intercom**: Check console for widget loading

```bash
# Check email stub logs
docker compose logs core-api | grep "SendGrid"

# Check Stripe stub logs
docker compose logs core-api | grep "Stripe"
```

## Verification Checklist

- [ ] All services start successfully
- [ ] Database seeds 1000+ products
- [ ] Homepage loads with featured products
- [ ] Product detail page shows product info
- [ ] Add to cart works
- [ ] Cart shows items correctly
- [ ] Checkout flow completes
- [ ] Order is created in database
- [ ] Search page (legacy) works
- [ ] Mixed event naming in console
- [ ] Service logs show anti-patterns
- [ ] Bad data exists in database
- [ ] N+1 queries visible in logs
- [ ] Tech debt markers present in code
- [ ] Both App Router and Pages Router functional

## Success Criteria

✅ **Entire stack runs with single command**: `docker compose up`
✅ **All 3 microservices running**: core-api, search-service, pricing-service
✅ **Both routing patterns**: App Router AND Pages Router
✅ **1000+ products seeded**: Including bad data
✅ **Fake 3P integrations responding**: Stripe, SendGrid, Analytics
✅ **Multiple rendering patterns**: SSR, CSR, Server Components, ISR
✅ **Manual analytics with inconsistent names**: product_viewed vs ProductViewed
✅ **Service anti-patterns present**: Direct DB access across services
✅ **UI polished and modern**: Tailwind CSS styling
✅ **Full user flows work end-to-end**: Browse → Cart → Checkout → Order
✅ **Realistic complexity for auto-instrumentation testing**: All intentional issues present

## Cleanup

```bash
# Stop all services
docker compose down

# Remove all data (fresh start)
docker compose down -v
```

## Next Steps

Once verified, this application is ready for auto-instrumentation tool testing. The complexity built into this app will challenge instrumentation tools to:

1. Detect all event tracking patterns
2. Handle mixed routing strategies
3. Deal with service anti-patterns
4. Generate accurate event catalogs
5. Map user flows across frontend and backend
