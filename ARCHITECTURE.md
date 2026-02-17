# Marketplace Application Architecture

## Overview

This is a realistic marketplace application (similar to Etsy) built as a test harness for auto-instrumentation tools. The application intentionally includes complexity, mixed patterns, and anti-patterns found in real-world production applications.

**Key Principle**: This app resembles real applications with tech debt, not a clean demonstration app.

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router + Pages Router mixed)
- **Language**: TypeScript
- **Rendering**: Server Components, Client Components, SSR, ISR
- **State Management**: Zustand (primary), Context API, Local State, Redux (unused legacy)
- **Styling**: Tailwind CSS + Shadcn/UI components + CSS Modules + legacy CSS
- **HTTP Client**: Axios (via api-client wrapper)

### Backend Services
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 16 (shared across all services - anti-pattern)
- **Cache**: Redis 7
- **ORM**: Mixed - Prisma + raw SQL queries (inconsistent)

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Monorepo**: pnpm workspaces + Turborepo
- **Package Manager**: pnpm 8.15.0

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Port 3000)                     │
│                      Next.js 14 Application                      │
│  ┌────────────────────┐        ┌─────────────────────────────┐ │
│  │   App Router       │        │    Pages Router (Legacy)    │ │
│  │  (Server Components│        │   (getServerSideProps,      │ │
│  │   Server Actions)  │        │    getStaticProps)          │ │
│  └────────────────────┘        └─────────────────────────────┘ │
└──────────────────┬──────────────────────────┬───────────────────┘
                   │                          │
                   ▼                          ▼
         ┌─────────────────────────────────────────────┐
         │      Core API Service (Port 3001)           │
         │  ┌──────────────────────────────────────┐  │
         │  │ Routes: /api/auth, /api/products,    │  │
         │  │         /api/cart, /api/orders       │  │
         │  └──────────────────────────────────────┘  │
         │  ┌──────────────────────────────────────┐  │
         │  │ Services: CartService (Redis),       │  │
         │  │          OrderService                 │  │
         │  └──────────────────────────────────────┘  │
         └──────┬──────────────┬──────────────────────┘
                │              │
       ┌────────┘              └─────────┐
       ▼                                 ▼
┌─────────────────────┐      ┌─────────────────────┐
│ Search Service      │      │ Pricing Service     │
│   (Port 3002)       │      │   (Port 3003)       │
│                     │      │                     │
│ - Full-text search  │      │ - Dynamic pricing   │
│ - Direct DB access  │      │ - Inventory mgmt    │
│   (anti-pattern)    │      │ - Stock reservations│
└─────────────────────┘      └─────────────────────┘
       │                                 │
       │                                 │
       └────────┬────────────────────────┘
                ▼
    ┌───────────────────────┐        ┌──────────────┐
    │ PostgreSQL Database   │        │    Redis     │
    │   (Shared - anti-     │        │   Cache      │
    │    pattern)           │        │  Port 6379   │
    │   Port 5432           │        └──────────────┘
    └───────────────────────┘
```

## Database Architecture

### Single PostgreSQL Database (Anti-Pattern)
All services share one database, violating microservice boundaries:

**Tables:**
- `users` - User accounts (buyers, sellers, admins)
- `products` - Product catalog (1000+ seeded)
- `product_search_index` - Search index (owned by search-service)
- `inventory` - Stock management (owned by pricing-service)
- `orders` + `order_items` - Order history
- `cart_items` - Cart persistence (duplicates Redis - migration TODO)
- `analytics_events` - Manual event tracking (not indexed - slow)
- `reviews` - Partially implemented (tech debt)

**Intentional Issues:**
- ~5% products have orphaned sellers (seller deleted but products remain)
- ~10% products missing descriptions
- ~3% products with invalid/negative prices
- No indexes on frequently queried fields (performance issues)
- Some orders reference deleted products
- Race conditions in inventory reservations

## Request Cycles

### 1. Product Feed (Homepage)

**URL**: `http://localhost:3000/`

**Request Flow:**

```
1. Browser → Next.js Server Component
   └─ /apps/marketplace-web/src/app/page.tsx
      - Server-side rendering (SSR)
      - No client-side JavaScript initially

2. Next.js → Core API (Server-to-Server)
   └─ HTTP GET http://core-api:3001/api/products?limit=12
      - Uses internal Docker network
      - Environment variable: API_URL (core-api:3001)

3. Core API → PostgreSQL
   └─ /services/core-api/src/routes/products.ts
      - SQL: SELECT * FROM products WHERE status='active'
             ORDER BY created_at DESC LIMIT 12
      - Direct pg query (not Prisma)

4. Core API → Response
   └─ Returns JSON: { products: [...], total, page, limit }

5. Next.js → HTML Response
   └─ Server-renders product grid with Tailwind/Shadcn UI
   └─ Sends complete HTML to browser

6. Browser → Hydration
   └─ Client-side JavaScript loads
   └─ Link components become interactive
```

**Performance Characteristics:**
- **First Load**: ~200-500ms (Server Component rendering)
- **Subsequent Navigation**: ~30-50ms (cached)
- **Cache**: No-store (always fresh data)

**Components Involved:**
- `/apps/marketplace-web/src/app/page.tsx` - Server Component
- `/apps/marketplace-web/src/components/products/ProductCard.tsx` - Reusable card
- `/services/core-api/src/routes/products.ts` - API route handler

---

### 2. Individual Product View

**URL**: `http://localhost:3000/products/[id]`

**Request Flow:**

```
1. Browser → Next.js Link Click
   └─ Client-side navigation (no full page reload)
   └─ Prefetching enabled for visible links

2. Next.js Router → Server Component
   └─ /apps/marketplace-web/src/app/products/[id]/page.tsx
      - Dynamic route with [id] parameter
      - Server Component (RSC)

3. Next.js → Core API (Server-to-Server)
   └─ HTTP GET http://core-api:3001/api/products/{id}

4. Core API → PostgreSQL
   └─ /services/core-api/src/routes/products.ts
      - SQL: SELECT p.*, u.username as seller_name, u.email
             FROM products p
             LEFT JOIN users u ON p.seller_id = u.id
             WHERE p.id = $1

5. Core API → Pricing Service (HTTP)
   └─ HTTP GET http://pricing-service:3003/api/inventory/{productId}
      - Microservice call
      - Gets real-time stock levels

6. Pricing Service → PostgreSQL
   └─ SQL: SELECT available_stock, reserved_stock
           FROM inventory WHERE product_id = $1
      - Direct database access (anti-pattern)

7. Core API → Search Service (HTTP) [Optional]
   └─ HTTP POST http://search-service:3002/api/track-view
      - Tracks product view for search ranking
      - Fire-and-forget (doesn't block response)

8. Core API → Manual Analytics
   └─ /services/core-api/src/middleware/analytics-tracking.ts
      - Inconsistent event naming: "product_viewed" vs "ProductView"
      - Stored in analytics_events table

9. Core API → Response
   └─ Returns JSON: {
         product: {...},
         seller: {...},
         inventory: { available: X, reserved: Y }
       }

10. Next.js → HTML Response
    └─ Server-renders product detail page
    └─ Includes "Add to Cart" button (Client Component)

11. Browser → Hydration
    └─ Client Components become interactive
    └─ "Add to Cart" button ready to click
```

**Performance Issues (Intentional):**
- Multiple service calls (Core → Pricing → Search)
- No caching on inventory data
- Analytics insert on every view (no batching)

**Components Involved:**
- `/apps/marketplace-web/src/app/products/[id]/page.tsx` - Server Component
- `/apps/marketplace-web/src/components/products/AddToCartButton.tsx` - Client Component
- `/services/core-api/src/routes/products.ts` - Main handler
- `/services/pricing-service/src/services/inventory-service.ts` - Stock check

---

### 3. Purchase Flow (Add to Cart → Checkout → Order)

**URL Flow**: Product Page → Cart → Checkout → Order Confirmation

#### Step 3.1: Add to Cart

```
1. Browser → Click "Add to Cart" Button
   └─ Client Component handler
   └─ /apps/marketplace-web/src/components/products/AddToCartButton.tsx

2. Client → Core API (Client-to-Server)
   └─ HTTP POST http://localhost:3001/api/cart/items
      - Uses NEXT_PUBLIC_API_URL (localhost for client-side)
      - Headers: Authorization: Bearer {JWT_TOKEN}
      - Body: { productId: "...", quantity: 1 }

3. Core API → Auth Middleware
   └─ /services/core-api/src/middleware/auth.ts
      - Validates JWT token
      - Extracts userId from token
      - Attaches to req.user

4. Core API → CartService
   └─ /services/core-api/src/services/cart-service.ts

   4a. Get Product Details
       └─ SQL: SELECT id, title, price, stock
               FROM products WHERE id=$1 AND status='active'

   4b. Check Stock
       └─ If product.stock < quantity: throw "Insufficient stock"

   4c. Get Current Cart from Redis
       └─ Redis GET cart:{userId}
       └─ Returns JSON cart or empty cart

   4d. Update Cart Logic
       └─ If product already in cart: quantity += new quantity
       └─ Else: Add new item to cart.items[]

   4e. Recalculate Subtotal
       └─ cart.subtotal = sum(item.price * item.quantity)

   4f. Save to Redis
       └─ Redis SET cart:{userId} {JSON} EX 86400
       └─ 24-hour expiration

   4g. Save to PostgreSQL (Tech Debt)
       └─ SQL: INSERT INTO cart_items (user_id, product_id, quantity)
               VALUES ($1, $2, $3)
               ON CONFLICT (user_id, product_id)
               DO UPDATE SET quantity = cart_items.quantity + $3
       └─ Intentional duplication with Redis

5. Core API → Analytics Tracking
   └─ Manual event: "add_to_cart" or "AddToCart" (inconsistent)
   └─ INSERT INTO analytics_events (event_name, user_id, properties)

6. Core API → Response
   └─ Returns JSON: { cart: { items: [...], subtotal: X } }

7. Client → Update Zustand Store
   └─ /apps/marketplace-web/src/store/cart-store.ts
   └─ Updates global cart state
   └─ Triggers re-render of cart widget/badge

8. Browser → UI Update
   └─ Cart badge shows new item count
   └─ Success toast/notification
```

#### Step 3.2: View Cart

```
1. Browser → Navigate to /cart
   └─ Next.js Link or direct URL

2. Next.js → Client Component
   └─ /apps/marketplace-web/src/app/cart/page.tsx
      - 'use client' directive
      - Client-side rendering (CSR)

3. Client → useEffect on Mount
   └─ Fetch cart data from API

4. Client → Core API
   └─ HTTP GET http://localhost:3001/api/cart
      - Headers: Authorization: Bearer {token}

5. Core API → CartService.getCart()
   └─ Redis GET cart:{userId}
   └─ Returns cart with all items

6. Core API → Response
   └─ JSON: { userId, items: [...], subtotal, updatedAt }

7. Client → Render Cart Items
   └─ Shows product title, price, quantity
   └─ Quantity adjustment buttons (+/-)
   └─ Remove item buttons
   └─ "Proceed to Checkout" button
```

#### Step 3.3: Checkout (Server Action)

```
1. Browser → Click "Proceed to Checkout"
   └─ Navigate to /checkout

2. Next.js → Mixed Component
   └─ /apps/marketplace-web/src/app/checkout/page.tsx
      - Client Component for form
      - Server Action for submission

3. Client → Render Checkout Form
   └─ Shipping address fields
   └─ Payment method (Stripe stub)
   └─ Order summary

4. User → Fill Form and Submit

5. Browser → Invoke Server Action
   └─ Next.js Server Action (runs on server)
   └─ async function handleCheckout(formData) { ... }

6. Server Action → Core API
   └─ HTTP POST http://core-api:3001/api/orders
      - Body: {
          items: [...],
          shippingAddress: {...},
          paymentMethod: {...}
        }

7. Core API → OrderService.createOrder()
   └─ /services/core-api/src/services/order-service.ts

   7a. Validate Cart Items
       └─ Check all products still exist and have stock

   7b. Reserve Inventory (Pricing Service)
       └─ HTTP POST http://pricing-service:3003/api/inventory/reserve
       └─ Body: { items: [{ productId, quantity }] }
       └─ Pricing Service updates: reserved_stock += quantity
       └─ Race condition risk (intentional - no locking)

   7c. Calculate Pricing (Pricing Service)
       └─ HTTP POST http://pricing-service:3003/api/pricing/calculate
       └─ Dynamic pricing based on demand, time, etc.
       └─ Returns: { subtotal, tax, shipping, total }

   7d. Process Payment (Stripe Stub)
       └─ /packages/shared/src/integrations/stripe-stub.ts
       └─ Simulates Stripe API
       └─ 5% random failure rate (realistic testing)
       └─ Returns: { success, paymentIntentId, last4, brand }

   7e. Create Order in Database
       └─ BEGIN TRANSACTION
       └─ INSERT INTO orders (user_id, total, status, ...)
           VALUES (...) RETURNING id
       └─ INSERT INTO order_items (order_id, product_id, quantity, price)
           VALUES (...) -- One per cart item
       └─ COMMIT

   7f. Update Product Stock
       └─ UPDATE products SET stock = stock - quantity
           WHERE id IN (...)
       └─ Decrements available stock

   7g. Clear Cart
       └─ Redis DEL cart:{userId}
       └─ DELETE FROM cart_items WHERE user_id = $1

   7h. Send Order Confirmation Email (SendGrid Stub)
       └─ /packages/shared/src/integrations/sendgrid-stub.ts
       └─ Logs email to console (not actually sent)

   7i. Track Order Placed Event
       └─ Manual analytics: "order_placed" or "OrderPlaced"
       └─ INSERT INTO analytics_events

8. Core API → Response
   └─ Returns: {
       success: true,
       orderId: "...",
       total: X,
       paymentIntentId: "..."
     }

9. Server Action → Return to Client
   └─ Client receives order confirmation

10. Browser → Redirect to Confirmation
    └─ router.push(`/orders/${orderId}`)
    └─ Shows order summary and success message
```

#### Step 3.4: Order Confirmation

```
1. Browser → Navigate to /orders/[id]

2. Next.js → Server Component
   └─ /apps/marketplace-web/src/app/orders/[id]/page.tsx
      - Server Component (SSR)

3. Next.js → Core API
   └─ HTTP GET http://core-api:3001/api/orders/{orderId}

4. Core API → PostgreSQL (N+1 Query - Anti-Pattern)
   └─ SQL: SELECT * FROM orders WHERE id = $1 AND user_id = $2
   └─ SQL: SELECT * FROM order_items WHERE order_id = $1
           -- Separate query for each order item (N+1 problem)
   └─ SQL: SELECT * FROM products WHERE id = $1
           -- For each order_item, fetch product details

5. Core API → Response
   └─ Returns: {
       order: { id, total, status, created_at, ... },
       items: [
         { product: {...}, quantity, price, subtotal },
         ...
       ],
       shipping: {...}
     }

6. Next.js → Render Order Confirmation
   └─ Order ID and status
   └─ Item list with images
   └─ Total breakdown
   └─ Shipping address
   └─ Estimated delivery date
```

## Key Patterns and Anti-Patterns

### Intentional Complexity

1. **Mixed Routing Patterns**
   - App Router (modern): `/products/[id]`
   - Pages Router (legacy): `/pages/search.tsx`
   - Forces instrumentation to handle both patterns

2. **Inconsistent Data Fetching**
   - Server Components: Direct API calls
   - Client Components: Axios via api-client
   - getServerSideProps: Legacy SSR
   - Server Actions: Form submissions

3. **Service Boundary Violations**
   - Search Service queries Core API's database directly
   - Pricing Service sometimes calls Core API, sometimes direct DB
   - Shared PostgreSQL database across all services

4. **Multiple State Management**
   - Zustand: Cart state
   - Context API: User auth (partially implemented)
   - Local useState: Form state
   - Redux: Leftover slice (unused - tech debt)

5. **Inconsistent Event Naming**
   - `product_viewed` (snake_case)
   - `ProductViewed` (PascalCase)
   - `product-view` (kebab-case)
   - Simulates real-world analytics mess

6. **Performance Issues**
   - N+1 queries in order detail endpoint
   - No pagination limits on some endpoints
   - Missing database indexes
   - No response caching on frequently accessed data

7. **Race Conditions**
   - Inventory reservations have no locking mechanism
   - Multiple users can reserve same stock simultaneously
   - Realistic concurrency issues

8. **Tech Debt Markers**
   - TODO comments throughout
   - Commented-out code blocks
   - Duplicate data (Redis + PostgreSQL for cart)
   - Unused imports and functions
   - Feature flags (`USE_NEW_CHECKOUT`)

## Fake 3rd Party Integrations

All external services are stubbed for testing:

1. **Stripe** (`/packages/shared/src/integrations/stripe-stub.ts`)
   - Simulates payment processing
   - 5% random failure rate
   - Returns fake payment intent IDs

2. **SendGrid** (`/packages/shared/src/integrations/sendgrid-stub.ts`)
   - Simulates email sending
   - Logs to console instead of sending

3. **Google Analytics** (`/packages/shared/src/integrations/analytics-stub.ts`)
   - Simulates event tracking
   - Logs to console and database

4. **Intercom** (`/public/scripts/intercom.js`)
   - Fake chat widget script
   - Loaded in `_document.tsx`

## Running the Application

**Start Everything:**
```bash
docker compose up
```

**Access Points:**
- Frontend: http://localhost:3000
- Core API: http://localhost:3001
- Search Service: http://localhost:3002
- Pricing Service: http://localhost:3003
- PostgreSQL: localhost:5432
- Redis: localhost:6379

**Demo Flow:**
1. Visit http://localhost:3000
2. Click "Quick Demo Login" (creates unique test account)
3. Browse products
4. Add items to cart
5. Proceed to checkout
6. Complete purchase
7. View order confirmation

## Purpose

This application serves as a realistic test harness for auto-instrumentation tools. The intentional complexity, anti-patterns, and tech debt make it challenging to instrument automatically—mirroring real-world production applications where instrumentation is most needed.

**Next Step**: Run auto-instrumentation tools against this codebase to generate event catalogs and identify tracking gaps.
