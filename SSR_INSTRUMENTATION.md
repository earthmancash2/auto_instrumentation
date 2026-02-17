# SSR Instrumentation: Complete Request Cycle

This branch demonstrates **production-grade instrumentation** for Server-Side Rendering (SSR) with client-side hydration, showing how to track search requests across multiple layers while maintaining stability across client changes.

## 🎯 Goals

1. **Backend-First**: Backend events are the source of truth
2. **Request Correlation**: All events linked via `request_id` and `search_id`
3. **Client Stability**: Instrumentation doesn't break when clients (iOS, Android, Web) change
4. **Prefetch Handling**: Distinguish real searches from prefetched ones
5. **Complete Journey**: Track from API request → SSR → hydration → user interaction

---

## 📊 Request Cycle Visualization

```
User searches for "laptop"
        ↓
┌───────────────────────────────────────────────────────────────────┐
│ 1. CLIENT: User navigates to /search?q=laptop                    │
└───────────────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────────────┐
│ 2. NEXT.JS SSR: getServerSideProps runs                          │
│    - Generates request_id: abc-123                                │
│    - Calls Search Service API                                     │
└───────────────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────────────┐
│ 3. SEARCH SERVICE: /api/search?q=laptop                          │
│                                                                    │
│    EVENT 1: search_request_received                          │
│    ├─ request_id: abc-123                                        │
│    ├─ search_id: def-456 (deterministic hash)                   │
│    ├─ search_query: "laptop"                                     │
│    ├─ client_type: "web-ssr"                                     │
│    └─ timestamp: 2026-02-17T10:00:00.100Z                       │
└───────────────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────────────┐
│ 4. SEARCH SERVICE: Query database                                │
│    - PostgreSQL full-text search                                 │
│    - Takes 150ms                                                  │
│    - Returns 47 products                                          │
└───────────────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────────────┐
│ 5. SEARCH SERVICE: Return results                                │
│                                                                    │
│    EVENT 2: search_request_completed                         │
│    ├─ request_id: abc-123 (SAME)                                │
│    ├─ search_id: def-456 (SAME)                                 │
│    ├─ results_summary: { total: 47, returned: 20 }              │
│    ├─ results_full: [{ id, title, price, rank }, ...]           │
│    ├─ cache_hit: false                                           │
│    ├─ query_time_ms: 150                                         │
│    └─ timestamp: 2026-02-17T10:00:00.250Z                       │
└───────────────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────────────┐
│ 6. NEXT.JS SSR: Render HTML                                      │
│                                                                    │
│    EVENT 3: search_page_rendered_ssr (console.log)              │
│    ├─ request_id: abc-123 (SAME)                                │
│    ├─ search_id: def-456 (SAME)                                 │
│    ├─ search_query: "laptop"                                     │
│    ├─ results_count: 20                                          │
│    ├─ render_type: "server"                                      │
│    └─ timestamp: 2026-02-17T10:00:00.300Z                       │
└───────────────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────────────┐
│ 7. CLIENT: Browser receives HTML                                 │
│    - User sees results immediately (content visible)              │
│    - HTML includes embedded request_id & search_id               │
└───────────────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────────────┐
│ 8. CLIENT: React hydrates                                        │
│                                                                    │
│    EVENT 4: search_page_hydration                                 │
│    ├─ request_id: abc-123 (SAME)                                │
│    ├─ search_id: def-456 (SAME)                                 │
│    ├─ search_query: "laptop"                                     │
│    ├─ results_count: 20                                          │
│    ├─ time_to_hydrate_ms: 1200                                   │
│    ├─ viewport_width: 1920                                       │
│    └─ timestamp: 2026-02-17T10:00:01.500Z                       │
└───────────────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────────────┐
│ 9. CLIENT: User clicks result #3                                 │
│                                                                    │
│    EVENT 5: search_result_clicked                                │
│    ├─ request_id: abc-123 (SAME)                                │
│    ├─ search_id: def-456 (SAME)                                 │
│    ├─ search_query: "laptop"                                     │
│    ├─ product_id: "xyz-789"                                      │
│    ├─ result_position: 2 (0-indexed)                             │
│    ├─ result_rank: 0.85                                          │
│    ├─ time_to_click_ms: 3200                                     │
│    └─ timestamp: 2026-02-17T10:00:03.200Z                       │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Event Correlation

All events share common IDs for linking:

| ID Type | Purpose | Scope |
|---------|---------|-------|
| `request_id` | Unique per API call | Single request/response cycle |
| `search_id` | Deterministic hash of query+filters | Logical search (same across retries) |
| `session_id` | User session | All requests in session |
| `trace_id` | Distributed tracing | Cross-service requests |

### Example Query to Join Events:

```sql
SELECT
  event_name,
  properties->>'request_id' as request_id,
  properties->>'search_query' as query,
  properties->>'results_count' as results,
  timestamp
FROM analytics_events
WHERE properties->>'request_id' = 'abc-123'
ORDER BY timestamp;
```

**Output:**
```
search_request_received    | abc-123 | laptop | null | 10:00:00.100
search_request_completed   | abc-123 | laptop | 20   | 10:00:00.250
search_page_rendered_ssr       | abc-123 | laptop | 20   | 10:00:00.300
search_page_hydration           | abc-123 | laptop | 20   | 10:00:01.500
search_result_clicked          | abc-123 | laptop | --   | 10:00:03.200
```

---

## 📁 Files Changed

### 1. **Correlation ID Utilities** (New)
```
packages/shared/src/utils/correlation-ids.ts
```
- `generateRequestId()`: UUID for each request
- `generateSearchId()`: Deterministic hash for deduplication
- `detectClientType()`: Extract client from headers
- `isPrefetchRequest()`: Check if request is prefetch
- `getRetryCount()`: Get retry attempt number

### 2. **Search Service Backend** (Modified)
```
services/search-service/src/controllers/search-controller.ts
```

**Events Added:**
- ✅ `search_request_received` - When API receives request
- ✅ `search_request_completed` - When results returned (cache hit or fresh query)
- ✅ `search_request_failed` - When search errors

**Key Features:**
- Generates/extracts correlation IDs from headers
- Detects client type, prefetch status, retry count
- Tracks full results + summary
- Measures query and cache performance
- Returns `_meta` in response for client correlation

### 3. **Search SSR Page** (Modified)
```
apps/marketplace-web/src/pages/search.tsx
```

**Events Added:**
- ✅ `search_page_rendered_ssr` - When Next.js renders HTML (server-side)
- ✅ `search_page_hydration` - When React hydrates (client-side)
- ✅ `search_query_typed` - When user changes search query
- ✅ `search_result_clicked` - When user clicks a result

**Key Features:**
- Receives correlation IDs from backend via props
- Tracks hydration timing (UX metric)
- Tracks user interactions with context
- Shows debug info UI with request/search IDs

---

## 🎯 Why This Approach is Production-Grade

### 1. **Client Stability**
Backend events don't change when:
- iOS app refactored
- Android app uses different framework
- Web app moves from SSR to SPA
- New clients (desktop app, CLI) added

### 2. **Prefetch Handling**
```typescript
// Client adds header
headers: { 'x-prefetch': 'true' }

// Backend tags event
analytics.track({
  name: 'search_request_received',
  properties: {
    is_prefetch: true,
    // Exclude from core metrics downstream
  }
});
```

### 3. **Deduplication**
```typescript
// Same query = same search_id
generateSearchId("laptop", { category: "Electronics" })
// → "a3f2e9d1b4c8..."

// Retries have same search_id, different request_id
// Allows counting unique searches vs. total requests
```

### 4. **Performance Metrics**
```sql
-- Average time to hydration (UX metric)
SELECT AVG((properties->>'time_to_hydrate_ms')::int)
FROM analytics_events
WHERE event_name = 'search_page_hydration';

-- Average database query time (backend metric)
SELECT AVG((properties->>'database_time_ms')::int)
FROM analytics_events
WHERE event_name = 'search_request_completed';
```

### 5. **Click-Through Rate**
```sql
-- CTR: % of searches that resulted in clicks
SELECT
  COUNT(DISTINCT CASE WHEN event_name = 'search_result_clicked'
                      THEN properties->>'request_id' END) * 100.0 /
  COUNT(DISTINCT CASE WHEN event_name = 'search_request_completed'
                      THEN properties->>'request_id' END) AS ctr_percentage
FROM analytics_events
WHERE properties->>'is_prefetch' = 'false';
```

---

## 🚀 Testing the Instrumentation

### 1. Start the Application

```bash
docker compose up -d
```

### 2. Index Products

```bash
curl -X POST http://localhost:3002/api/search/index
```

### 3. Perform a Search

Navigate to: **http://localhost:3000/search?q=shirt**

### 4. Check Logs

**Backend events (Search Service):**
```bash
docker compose logs search-service | grep "Analytics"
```

You should see:
```
[Analytics] search_request_received { request_id: 'abc-123', search_query: 'shirt', ... }
[Analytics] search_request_completed { request_id: 'abc-123', results_summary: {...}, ... }
```

**SSR events (Next.js):**
```bash
docker compose logs web | grep "SSR Analytics"
```

You should see:
```
[SSR Analytics] search_page_rendered_ssr { request_id: 'abc-123', results_count: 20, ... }
```

**Client events:**
- Open browser console
- Navigate to search page
- See: `search_page_hydration`, `search_result_clicked` events

### 5. Verify Correlation

Note the `request_id` shown in the blue debug box on the search page. Check that all events (backend, SSR, client) share the same `request_id`.

---

## 📊 Analytics Queries

### Complete Search Journey

```sql
-- Get full event timeline for a search
SELECT
  event_name,
  properties->>'timestamp' as ts,
  properties->>'results_count' as count,
  properties->>'cache_hit' as cached
FROM analytics_events
WHERE properties->>'request_id' = 'abc-123'
ORDER BY ts;
```

### Search Performance

```sql
-- P50, P95, P99 query times
SELECT
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (properties->>'query_time_ms')::int) as p50,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (properties->>'query_time_ms')::int) as p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY (properties->>'query_time_ms')::int) as p99
FROM analytics_events
WHERE event_name = 'search_request_completed';
```

### Top Searches

```sql
-- Most popular search queries
SELECT
  properties->>'search_query' as query,
  COUNT(DISTINCT properties->>'search_id') as unique_searches,
  COUNT(*) as total_requests
FROM analytics_events
WHERE event_name = 'search_request_completed'
  AND properties->>'is_prefetch' = 'false'
GROUP BY query
ORDER BY unique_searches DESC
LIMIT 10;
```

### Zero-Result Searches

```sql
-- Searches with no results (opportunities for improvement)
SELECT
  properties->>'search_query' as query,
  COUNT(*) as count
FROM analytics_events
WHERE event_name = 'search_request_completed'
  AND (properties->'results_summary'->>'returned_count')::int = 0
GROUP BY query
ORDER BY count DESC;
```

---

## 🎯 Key Takeaways

1. **Backend First**: Search service events are source of truth
2. **ID Correlation**: `request_id` links all events in the journey
3. **Multi-Layer**: Backend → SSR → Client hydration → Interactions
4. **Stable**: Works across web, iOS, Android, and future clients
5. **Prefetch-Aware**: Distinguishes real searches from speculative fetches
6. **Complete**: Query, results, timing, user actions all tracked

---

## 🔄 Comparison with Main Branch

Run this to see the diff:

```bash
git diff main ssr-instrumentation
```

Or view on GitHub:
```
https://github.com/earthmancash2/auto_instrumentation/compare/main...ssr-instrumentation
```

**Summary of Changes:**
- ✅ +1 new file: `correlation-ids.ts` utilities
- ✅ Modified: `search-controller.ts` (+180 lines of instrumentation)
- ✅ Modified: `search.tsx` (+160 lines of instrumentation)
- ✅ 5 new event types across 3 layers
- ✅ Complete request correlation with IDs

---

## 📖 Further Reading

- [Next.js SSR Documentation](https://nextjs.org/docs/basic-features/pages#server-side-rendering)
- [Correlation IDs in Distributed Systems](https://www.rapidapi.com/blog/api-glossary/correlation-id/)
- [Web Performance Metrics](https://web.dev/vitals/)

---

**This instrumentation is ready for production and demo purposes!** 🎉
