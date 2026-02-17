# Event Catalog

This document catalogs all analytics events in the marketplace application. All events follow the standards defined in [INSTRUMENTATION_STANDARDS.md](./INSTRUMENTATION_STANDARDS.md).

**Last Updated**: 2026-02-17

---

## Table of Contents

- [Backend Events](#backend-events)
  - [Search Service](#search-service)
  - [Core API](#core-api)
  - [Pricing Service](#pricing-service)
- [Frontend Events](#frontend-events)
  - [Search Pages](#search-pages)
  - [Product Pages](#product-pages)
  - [Cart & Checkout](#cart--checkout)
- [System Events](#system-events)

---

## Backend Events

### Search Service

#### search_api_request_received

**When**: Fires when the search service receives a search request

**Location**: `services/search-service/src/controllers/search-controller.ts:65`

**Schema Version**: 1

**Properties**:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| timestamp | string | ✅ | ISO 8601 timestamp when event occurred |
| event_name | string | ✅ | Always "search_api_request_received" |
| schema_version | number | ✅ | Event schema version (currently 1) |
| request_id | string | ✅ | Unique request identifier (UUID) |
| search_id | string | ✅ | Deterministic hash of query + filters |
| session_id | string | ✅ | User session identifier |
| trace_id | string | ✅ | Distributed tracing ID |
| user_id | string | ✅ | Authenticated user ID (null if anonymous) |
| client_context | object | ✅ | Client context blob from headers |
| client_context.device_id | string | ✅ | Device identifier |
| client_context.cookie_id | string | ✅ | Browser cookie identifier |
| client_context.user_agent | string | ✅ | Full user agent string |
| client_context.ip_address | string | ✅ | Client IP address |
| service | string | ✅ | Always "search-service" |
| endpoint | string | ✅ | API endpoint path (e.g., "/api/search") |
| search_query | string | ✅ | Raw search query string |
| filters | object | ❌ | Applied filters (category, price range, etc.) |
| pagination | object | ✅ | Pagination parameters |
| pagination.page | number | ✅ | Page number (1-indexed) |
| pagination.limit | number | ✅ | Results per page |
| client_type | string | ✅ | Client type ("web-ssr", "ios", "android", etc.) |
| client_version | string | ❌ | Client version string |
| is_prefetch | boolean | ✅ | Whether request is a prefetch |
| is_retry | boolean | ✅ | Whether request is a retry |
| retry_count | number | ✅ | Number of retry attempts (0 for first attempt) |

**Example**:

```json
{
  "timestamp": "2026-02-17T10:00:00.100Z",
  "event_name": "search_api_request_received",
  "schema_version": 1,
  "request_id": "abc-123",
  "search_id": "a3f2e9d1b4c8",
  "session_id": "session-789",
  "trace_id": "abc-123",
  "user_id": "user-456",
  "client_context": {
    "device_id": "device-123",
    "cookie_id": "cookie-xyz",
    "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "ip_address": "192.168.1.1"
  },
  "service": "search-service",
  "endpoint": "/api/search",
  "search_query": "laptop",
  "filters": {
    "category": "Electronics"
  },
  "pagination": {
    "page": 1,
    "limit": 20
  },
  "client_type": "web-ssr",
  "client_version": "1.0.0",
  "is_prefetch": false,
  "is_retry": false,
  "retry_count": 0
}
```

---

#### search_api_request_completed

**When**: Fires when search service returns results (cache hit or fresh query)

**Location**: `services/search-service/src/controllers/search-controller.ts:103` (cache hit), `services/search-service/src/controllers/search-controller.ts:168` (fresh query)

**Schema Version**: 1

**Properties**:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| timestamp | string | ✅ | ISO 8601 timestamp when event occurred |
| event_name | string | ✅ | Always "search_api_request_completed" |
| schema_version | number | ✅ | Event schema version (currently 1) |
| request_id | string | ✅ | Unique request identifier (same as received event) |
| search_id | string | ✅ | Deterministic hash of query + filters |
| session_id | string | ✅ | User session identifier |
| trace_id | string | ✅ | Distributed tracing ID |
| user_id | string | ✅ | Authenticated user ID (null if anonymous) |
| client_context | object | ✅ | Client context blob from headers |
| service | string | ✅ | Always "search-service" |
| endpoint | string | ✅ | API endpoint path |
| results_summary | object | ✅ | Summary of results |
| results_summary.total_matches | number | ✅ | Total number of matching products |
| results_summary.returned_count | number | ✅ | Number of products returned in response |
| results_summary.has_more | boolean | ✅ | Whether more results available |
| results_summary.top_3_product_ids | array | ✅ | IDs of top 3 results |
| results_full | array | ✅ | Full result list with product details |
| cache_hit | boolean | ✅ | Whether results came from cache |
| query_time_ms | number | ✅ | Total query time in milliseconds |
| database_time_ms | number | ✅ | Database query time (0 for cache hits) |
| is_success | boolean | ✅ | Always true for this event |
| error | null | ✅ | Always null for this event |

**Example**:

```json
{
  "timestamp": "2026-02-17T10:00:00.250Z",
  "event_name": "search_api_request_completed",
  "schema_version": 1,
  "request_id": "abc-123",
  "search_id": "a3f2e9d1b4c8",
  "session_id": "session-789",
  "trace_id": "abc-123",
  "user_id": "user-456",
  "client_context": {
    "device_id": "device-123",
    "cookie_id": "cookie-xyz",
    "user_agent": "Mozilla/5.0 ...",
    "ip_address": "192.168.1.1"
  },
  "service": "search-service",
  "endpoint": "/api/search",
  "results_summary": {
    "total_matches": 47,
    "returned_count": 20,
    "has_more": true,
    "top_3_product_ids": ["prod-1", "prod-2", "prod-3"]
  },
  "results_full": [
    {
      "id": "prod-1",
      "title": "Dell XPS 13 Laptop",
      "price": 99900,
      "category": "Electronics",
      "rank": 0.95
    }
  ],
  "cache_hit": false,
  "query_time_ms": 150,
  "database_time_ms": 145,
  "is_success": true,
  "error": null
}
```

---

#### search_api_request_failed

**When**: Fires when search service encounters an error

**Location**: `services/search-service/src/controllers/search-controller.ts:226`

**Schema Version**: 1

**Properties**:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| timestamp | string | ✅ | ISO 8601 timestamp when error occurred |
| event_name | string | ✅ | Always "search_api_request_failed" |
| schema_version | number | ✅ | Event schema version (currently 1) |
| request_id | string | ✅ | Unique request identifier |
| session_id | string | ✅ | User session identifier |
| user_id | string | ✅ | Authenticated user ID (null if anonymous) |
| client_context | object | ✅ | Client context blob from headers |
| service | string | ✅ | Always "search-service" |
| endpoint | string | ✅ | API endpoint path |
| search_query | string | ✅ | Search query that caused error |
| error_message | string | ✅ | Error message text |
| error_type | string | ✅ | Error class/type name |
| response_time_ms | number | ✅ | Time until error occurred |

**Example**:

```json
{
  "timestamp": "2026-02-17T10:00:00.500Z",
  "event_name": "search_api_request_failed",
  "schema_version": 1,
  "request_id": "abc-123",
  "session_id": "session-789",
  "user_id": "user-456",
  "client_context": {
    "device_id": "device-123",
    "cookie_id": "cookie-xyz",
    "user_agent": "Mozilla/5.0 ...",
    "ip_address": "192.168.1.1"
  },
  "service": "search-service",
  "endpoint": "/api/search",
  "search_query": "laptop",
  "error_message": "Database connection timeout",
  "error_type": "DatabaseError",
  "response_time_ms": 5000
}
```

---

## Frontend Events

### Search Pages

#### search_page_hydrated

**When**: Fires when React hydrates the SSR-rendered search page

**Location**: `apps/marketplace-web/src/pages/search.tsx:42`

**Schema Version**: 1

**Properties**:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| timestamp | string | ✅ | ISO 8601 timestamp when hydration completed |
| event_name | string | ✅ | Always "search_page_hydrated" |
| schema_version | number | ✅ | Event schema version (currently 1) |
| request_id | string | ✅ | Request ID from SSR (inherited) |
| search_id | string | ✅ | Search ID from SSR (inherited) |
| session_id | string | ✅ | User session identifier |
| user_id | string | ✅ | Authenticated user ID (null if anonymous) |
| device_id | string | ✅ | Device identifier |
| cookie_id | string | ✅ | Browser cookie identifier |
| user_agent | string | ✅ | Full user agent string |
| ip_address | string | ❌ | Client IP (not available client-side) |
| page | string | ✅ | Current page path (e.g., "/search") |
| action | string | ✅ | Action type ("page_hydration") |
| viewport_width | number | ✅ | Viewport width in pixels |
| viewport_height | number | ✅ | Viewport height in pixels |
| screen_width | number | ✅ | Screen width in pixels |
| screen_height | number | ✅ | Screen height in pixels |
| device_pixel_ratio | number | ✅ | Device pixel ratio |
| search_query | string | ✅ | Search query from SSR |
| num_results | number | ✅ | Number of results displayed |
| time_to_hydrate_ms | number | ✅ | Time from SSR render to hydration |
| time_to_interactive_ms | number | ✅ | Performance.now() value |
| connection_type | string | ❌ | Network connection type (if available) |
| page_type | string | ✅ | Always "search" |
| render_type | string | ✅ | Always "ssr_hydration" |

**Example**:

```json
{
  "timestamp": "2026-02-17T10:00:01.500Z",
  "event_name": "search_page_hydrated",
  "schema_version": 1,
  "request_id": "abc-123",
  "search_id": "a3f2e9d1b4c8",
  "session_id": "session-789",
  "user_id": "user-456",
  "device_id": "device-123",
  "cookie_id": "cookie-xyz",
  "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "page": "/search",
  "action": "page_hydration",
  "viewport_width": 1920,
  "viewport_height": 1080,
  "screen_width": 1920,
  "screen_height": 1080,
  "device_pixel_ratio": 2.0,
  "search_query": "laptop",
  "num_results": 20,
  "time_to_hydrate_ms": 1200,
  "time_to_interactive_ms": 1534.5,
  "connection_type": "4g",
  "page_type": "search",
  "render_type": "ssr_hydration"
}
```

---

#### search_result_clicked

**When**: Fires when user clicks a search result

**Location**: `apps/marketplace-web/src/pages/search.tsx:101`

**Schema Version**: 1

**Properties**:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| timestamp | string | ✅ | ISO 8601 timestamp when clicked |
| event_name | string | ✅ | Always "search_result_clicked" |
| schema_version | number | ✅ | Event schema version (currently 1) |
| request_id | string | ✅ | Request ID from SSR |
| search_id | string | ✅ | Search ID from SSR |
| session_id | string | ✅ | User session identifier |
| user_id | string | ✅ | Authenticated user ID (null if anonymous) |
| device_id | string | ✅ | Device identifier |
| cookie_id | string | ✅ | Browser cookie identifier |
| user_agent | string | ✅ | Full user agent string |
| page | string | ✅ | Always "/search" |
| action | string | ✅ | Always "result_click" |
| viewport_width | number | ✅ | Viewport width in pixels |
| viewport_height | number | ✅ | Viewport height in pixels |
| screen_width | number | ✅ | Screen width in pixels |
| screen_height | number | ✅ | Screen height in pixels |
| device_pixel_ratio | number | ✅ | Device pixel ratio |
| search_query | string | ✅ | Search query that produced results |
| product_id | string | ✅ | ID of clicked product |
| product_title | string | ✅ | Title of clicked product |
| product_price | number | ✅ | Price of clicked product (in cents) |
| result_position | number | ✅ | 0-indexed position in results |
| result_rank | number | ❌ | Relevance score (0-1) if available |
| total_results_shown | number | ✅ | Number of results displayed on page |
| total_results_available | number | ✅ | Total matching results |
| time_to_click_ms | number | ✅ | Time from hydration to click |

**Example**:

```json
{
  "timestamp": "2026-02-17T10:00:03.200Z",
  "event_name": "search_result_clicked",
  "schema_version": 1,
  "request_id": "abc-123",
  "search_id": "a3f2e9d1b4c8",
  "session_id": "session-789",
  "user_id": "user-456",
  "device_id": "device-123",
  "cookie_id": "cookie-xyz",
  "user_agent": "Mozilla/5.0 ...",
  "page": "/search",
  "action": "result_click",
  "viewport_width": 1920,
  "viewport_height": 1080,
  "screen_width": 1920,
  "screen_height": 1080,
  "device_pixel_ratio": 2.0,
  "search_query": "laptop",
  "product_id": "xyz-789",
  "product_title": "Dell XPS 13",
  "product_price": 99900,
  "result_position": 2,
  "result_rank": 0.85,
  "total_results_shown": 20,
  "total_results_available": 47,
  "time_to_click_ms": 3200
}
```

---

## System Events

### system_inventory_synced

**When**: Fires when background job syncs inventory from external source

**Location**: `services/pricing-service/src/jobs/sync-inventory.ts` (not yet implemented)

**Schema Version**: 1

**Properties**:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| timestamp | string | ✅ | ISO 8601 timestamp when sync completed |
| event_name | string | ✅ | Always "system_inventory_synced" |
| schema_version | number | ✅ | Event schema version (currently 1) |
| service | string | ✅ | Always "pricing-service" |
| job_id | string | ✅ | Unique job identifier |
| trigger | string | ✅ | How job was triggered ("scheduled", "manual", "event-driven") |
| num_products_synced | number | ✅ | Number of products updated |
| sync_duration_ms | number | ✅ | Total sync duration in milliseconds |
| is_success | boolean | ✅ | Whether sync completed successfully |
| error_message | string | ❌ | Error message if failed |

**Example**:

```json
{
  "timestamp": "2026-02-17T03:00:00.000Z",
  "event_name": "system_inventory_synced",
  "schema_version": 1,
  "service": "pricing-service",
  "job_id": "sync-job-456",
  "trigger": "scheduled",
  "num_products_synced": 1000,
  "sync_duration_ms": 45000,
  "is_success": true
}
```

---

## Event Relationships

### Request Cycle Flow

```
search_api_request_received
  ↓ (request_id: abc-123)
search_api_request_completed
  ↓ (request_id: abc-123)
search_page_hydrated
  ↓ (request_id: abc-123, search_id: a3f2e9d1b4c8)
search_result_clicked
```

All events in a request cycle share the same `request_id` for correlation.

---

## Analytics Queries

### Example: Full Search Journey

```sql
SELECT
  event_name,
  timestamp,
  properties->>'search_query' as query,
  properties->>'num_results' as results
FROM analytics_events
WHERE properties->>'request_id' = 'abc-123'
ORDER BY timestamp;
```

### Example: Click-Through Rate

```sql
SELECT
  COUNT(DISTINCT CASE WHEN event_name = 'search_result_clicked'
                      THEN properties->>'request_id' END) * 100.0 /
  COUNT(DISTINCT CASE WHEN event_name = 'search_api_request_completed'
                      THEN properties->>'request_id' END) AS ctr_percentage
FROM analytics_events
WHERE properties->>'is_prefetch' = 'false';
```

---

**Note**: This catalog is automatically generated from event implementations. To add new events, follow the process in [INSTRUMENTATION_STANDARDS.md](./INSTRUMENTATION_STANDARDS.md#change-management).
