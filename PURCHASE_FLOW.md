# Purchase Flow - Detailed Sequence Diagram

## Complete Flow: Product View → Add to Cart → Checkout → Order Confirmation

```
┌─────────┐  ┌──────────┐  ┌─────────┐  ┌────────┐  ┌────────┐  ┌────────┐
│ Browser │  │ Next.js  │  │Core API │  │Pricing │  │ Stripe │  │Postgres│
└────┬────┘  └────┬─────┘  └────┬────┘  └───┬────┘  └───┬────┘  └───┬────┘
     │            │              │            │            │           │
     │                                                                 │
     ├─── PHASE 1: VIEW PRODUCT ─────────────────────────────────────┤
     │            │              │            │            │           │
     │  GET /products/abc123     │            │            │           │
     ├───────────>│              │            │            │           │
     │            │ GET /api/products/abc123  │            │           │
     │            ├─────────────>│            │            │           │
     │            │              │ SELECT * FROM products              │
     │            │              ├───────────────────────────────────>│
     │            │              │<───────────────────────────────────┤
     │            │              │ product data                        │
     │            │              │                                     │
     │            │              │ GET /api/inventory/abc123           │
     │            │              ├───────────>│                        │
     │            │              │            │ SELECT available_stock │
     │            │              │            ├───────────────────────>│
     │            │              │            │<───────────────────────┤
     │            │              │<───────────┤ stock: 87              │
     │            │              │                                     │
     │            │              │ POST /api/track-view (async)        │
     │            │              ├────────────────────> Search Service │
     │            │              │                                     │
     │            │              │ INSERT INTO analytics_events        │
     │            │              ├───────────────────────────────────>│
     │            │<─────────────┤ product + inventory                │
     │<───────────┤ HTML with product details                         │
     │            │                                                    │
     │                                                                 │
     ├─── PHASE 2: ADD TO CART ──────────────────────────────────────┤
     │            │              │            │            │           │
     │  Click "Add to Cart"      │            │            │           │
     ├──┐         │              │            │            │           │
     │  │         │              │            │            │           │
     │<─┘         │              │            │            │           │
     │  POST /api/cart/items     │            │            │           │
     │  { productId: "abc123", quantity: 1 }  │            │           │
     ├────────────┼─────────────>│            │            │           │
     │            │              │ Validate JWT                        │
     │            │              ├──┐                                  │
     │            │              │<─┘ userId extracted                │
     │            │              │                                     │
     │            │              │ SELECT * FROM products WHERE id=... │
     │            │              ├───────────────────────────────────>│
     │            │              │<───────────────────────────────────┤
     │            │              │ Check stock >= quantity             │
     │            │              ├──┐                                  │
     │            │              │<─┘                                  │
     │            │              │                                     │
     │            │              │ Redis GET cart:{userId}             │
     │            │              ├────────────────────> Redis          │
     │            │              │<─────────────────────┤ current cart │
     │            │              │                                     │
     │            │              │ Update cart logic                   │
     │            │              ├──┐ - Add/update item                │
     │            │              │  │ - Recalculate subtotal           │
     │            │              │<─┘                                  │
     │            │              │                                     │
     │            │              │ Redis SET cart:{userId}             │
     │            │              ├────────────────────> Redis          │
     │            │              │                                     │
     │            │              │ INSERT INTO cart_items              │
     │            │              │ ON CONFLICT UPDATE (tech debt)      │
     │            │              ├───────────────────────────────────>│
     │            │              │                                     │
     │            │              │ INSERT INTO analytics_events        │
     │            │              ├───────────────────────────────────>│
     │            │<─────────────┤ { cart: { items: [...], total } }  │
     │<───────────┤ 200 OK                                            │
     │            │                                                    │
     │  Update Zustand Store     │            │            │           │
     │  + Cart Badge             │            │            │           │
     │            │                                                    │
     │                                                                 │
     ├─── PHASE 3: CHECKOUT ─────────────────────────────────────────┤
     │            │              │            │            │           │
     │  Click "Checkout"         │            │            │           │
     ├───────────>│ Navigate to /checkout     │            │           │
     │<───────────┤ Render checkout form      │            │           │
     │            │                            │            │           │
     │  Fill form and submit     │            │            │           │
     ├───────────>│ Server Action             │            │           │
     │            │ POST /api/orders          │            │           │
     │            ├─────────────>│            │            │           │
     │            │              │                                     │
     │            │              │ BEGIN TRANSACTION                   │
     │            │              ├───────────────────────────────────>│
     │            │              │                                     │
     │            │              │ Validate cart items                 │
     │            │              │ SELECT * FROM products WHERE id IN  │
     │            │              ├───────────────────────────────────>│
     │            │              │<───────────────────────────────────┤
     │            │              │                                     │
     │            │              │ POST /api/inventory/reserve         │
     │            │              ├───────────>│                        │
     │            │              │            │ UPDATE inventory       │
     │            │              │            │ SET reserved += qty    │
     │            │              │            ├───────────────────────>│
     │            │              │            │<───────────────────────┤
     │            │              │<───────────┤ { reserved: true }     │
     │            │              │                                     │
     │            │              │ POST /api/pricing/calculate         │
     │            │              ├───────────>│                        │
     │            │              │<───────────┤ { subtotal, tax,      │
     │            │              │                shipping, total }    │
     │            │              │                                     │
     │            │              │ POST /v1/payment_intents (STUB)     │
     │            │              ├────────────┼───────────>│           │
     │            │              │            │            │ 5% random │
     │            │              │            │            │ failure   │
     │            │              │<───────────┼────────────┤ {success, │
     │            │              │                            id, ...} │
     │            │              │                                     │
     │            │              │ INSERT INTO orders                  │
     │            │              ├───────────────────────────────────>│
     │            │              │<───────────────────────────────────┤
     │            │              │ order_id                            │
     │            │              │                                     │
     │            │              │ INSERT INTO order_items (N times)   │
     │            │              ├───────────────────────────────────>│
     │            │              │<───────────────────────────────────┤
     │            │              │                                     │
     │            │              │ UPDATE products SET stock -= qty   │
     │            │              ├───────────────────────────────────>│
     │            │              │<───────────────────────────────────┤
     │            │              │                                     │
     │            │              │ DELETE FROM cart_items              │
     │            │              ├───────────────────────────────────>│
     │            │              │                                     │
     │            │              │ Redis DEL cart:{userId}             │
     │            │              ├────────────────────> Redis          │
     │            │              │                                     │
     │            │              │ COMMIT                              │
     │            │              ├───────────────────────────────────>│
     │            │              │<───────────────────────────────────┤
     │            │              │                                     │
     │            │              │ SendGrid API (STUB)                 │
     │            │              ├────────────────────> Console.log    │
     │            │              │                                     │
     │            │              │ INSERT INTO analytics_events        │
     │            │              ├───────────────────────────────────>│
     │            │<─────────────┤ { orderId, total, status }         │
     │<───────────┤ Redirect /orders/{orderId}                        │
     │            │                                                    │
     │                                                                 │
     ├─── PHASE 4: ORDER CONFIRMATION ───────────────────────────────┤
     │            │              │            │            │           │
     │  GET /orders/xyz789       │            │            │           │
     ├───────────>│              │            │            │           │
     │            │ GET /api/orders/xyz789    │            │           │
     │            ├─────────────>│            │            │           │
     │            │              │ SELECT * FROM orders                │
     │            │              ├───────────────────────────────────>│
     │            │              │<───────────────────────────────────┤
     │            │              │                                     │
     │            │              │ SELECT * FROM order_items (N+1!)    │
     │            │              ├───────────────────────────────────>│
     │            │              │<───────────────────────────────────┤
     │            │              │                                     │
     │            │              │ SELECT * FROM products (for each)   │
     │            │              ├───────────────────────────────────>│
     │            │              │<───────────────────────────────────┤
     │            │<─────────────┤ { order, items, shipping }         │
     │<───────────┤ HTML: Order confirmation page                     │
     │            │                                                    │
     │  ✓ Order Complete         │            │            │           │
     │                                                                 │
```

## Key Observations

### Multiple Database Round-Trips
1. **Product View**: 3-4 queries (product, inventory, analytics)
2. **Add to Cart**: 4-5 operations (product lookup, Redis get/set, DB insert, analytics)
3. **Checkout**: 8-12+ operations in transaction
4. **Order Confirmation**: N+1 query pattern (1 order + N items + N products)

### Service Communication Patterns
- **Synchronous HTTP**: Core API → Pricing/Search Services
- **Direct DB Access**: Search/Pricing → PostgreSQL (anti-pattern)
- **Fire-and-Forget**: Track-view events (async, non-blocking)
- **Stub APIs**: Stripe, SendGrid (5% failure rate for testing)

### State Management Layers
1. **PostgreSQL**: Persistent data (orders, products, users)
2. **Redis**: Session data (cart, 24hr TTL)
3. **Client State**: Zustand (cart badge, UI state)
4. **JWT Token**: Authentication (7-day expiry)

### Performance Bottlenecks (Intentional)
- ❌ N+1 queries in order detail
- ❌ No connection pooling limits
- ❌ Missing indexes (analytics_events, order_items.product_id)
- ❌ Synchronous external service calls in critical path
- ❌ No response caching
- ❌ Race conditions in inventory reservations

### Analytics Events Fired
1. `product_viewed` - Product detail page
2. `add_to_cart` / `AddToCart` - Cart addition (inconsistent naming)
3. `order_placed` / `OrderPlaced` - Purchase complete
4. `user_signed_up` - Demo login
5. `UserLogin` - Manual login

## Error Scenarios

### Payment Failure (5% random)
```
Checkout → Stripe Stub → Random Failure
└─> ROLLBACK transaction
└─> Inventory unreserved
└─> Cart preserved
└─> User sees error: "Payment failed, please try again"
```

### Out of Stock
```
Add to Cart → Check Stock → Insufficient
└─> Error 400: "Insufficient stock"
└─> Cart not updated
└─> User sees error message
```

### Invalid Auth Token
```
Add to Cart → JWT Validation → Token Expired/Invalid
└─> Error 401: Unauthorized
└─> Redirect to /login
└─> localStorage.removeItem('auth_token')
```

### Race Condition (Inventory)
```
User A: Reserve 10 units (stock: 10 → reserved: 10)
User B: Reserve 5 units (stock: 10 → reserved: 15) ❌ Oversold!
└─> Both orders succeed
└─> Inventory negative (realistic bug)
```

## Summary

This purchase flow demonstrates:
- ✅ Mixed rendering patterns (Server Components, Client Components, Server Actions)
- ✅ Microservice communication (HTTP between services)
- ✅ Multiple data stores (PostgreSQL, Redis, Client State)
- ✅ Third-party integrations (payment, email, analytics)
- ✅ Transaction management (BEGIN/COMMIT)
- ✅ Error handling (stock, payment, auth)
- ❌ Performance anti-patterns (N+1, no caching)
- ❌ Service anti-patterns (direct DB access across boundaries)
- ❌ Data consistency issues (race conditions)

This complexity makes it an ideal test case for auto-instrumentation tools that need to track events across frontend, API, and database layers.
