# Instrumentation Standards

**Purpose**: Define naming conventions, property modeling, and change management for analytics events across all services, repositories, and platforms.

**Scope**: Backend services, frontend applications, APIs (web, iOS, Android)

**Enforcement**: Automated validation at PR review stage

---

## Event Naming Conventions

### Rules (REQUIRED)

- **Format**: Depends on event category (see below)
- **Case**: snake_case only
- **Tense**: Past tense for user actions, stage names for lifecycle events

### Event Categories

Events fall into one of three categories, each with its own naming pattern:

#### 1. User Action Events

**Pattern**: `{object}_{user_action}`

**When**: User performs an action (click, view, type, submit, etc.)

**Verb Source**: MUST use verb from controlled user action list (see below)

**Examples**:
- `search_result_clicked` - User clicked a search result
- `product_viewed` - User viewed a product page
- `form_submitted` - User submitted a form
- `search_query_typed` - User typed in search box

#### 2. Request Cycle Events

**Pattern**: `{object}_request_{stage}` or `{object}_{stage}`

**When**: System lifecycle stages during request processing

**Stage Source**: MUST use stage from request stage list (see below)

**Examples**:
- `search_request_received` - Backend received search request
- `search_request_completed` - Backend completed search request
- `search_page_rendered` - Server rendered search page (SSR)
- `search_page_hydration` - Client hydrated search page

#### 3. System/Background Events

**Pattern**: `system_{object}_{stage}`

**When**: Background jobs, cron tasks, system processes (not part of user request cycle)

**Requirements**: NO client context, NO request_id

**Examples**:
- `system_inventory_synced` - Background job synced inventory
- `system_cache_expired` - Cache expiration occurred
- `system_email_processed` - Email queue processed message

---

### Controlled User Action Verbs

User action events MUST use one of these verbs (past tense):

| Verb | Description |
|------|-------------|
| `clicked` | User clicked/tapped an element |
| `viewed` | User viewed content (page, product, etc.) |
| `typed` | User entered text (search, input) |
| `submitted` | User submitted a form |
| `selected` | User made a selection from options |
| `scrolled` | User scrolled content |
| `expanded` | User expanded collapsible content |
| `collapsed` | User collapsed expanded content |
| `toggled` | User toggled a setting/switch |

---

### Request Stage List

Request cycle events MUST use one of these stages:

#### Backend Stages

| Stage | Description |
|-------|-------------|
| `received` | Server received a request |
| `started` | Long-running operation initiated |
| `completed` | Operation finished successfully |
| `failed` | Operation failed with error |

#### Frontend Stages

| Stage | Description |
|-------|-------------|
| `rendered` | Server-side rendering completed (SSR) |
| `hydration` | Client-side framework hydration completed |
| `interactive` | Page fully interactive |

#### Resource Stages

| Stage | Description |
|-------|-------------|
| `created` | New resource created |
| `updated` | Existing resource modified |
| `deleted` | Resource removed |
| `validated` | Data validation occurred |

#### System Stages (for system_ events)

| Stage | Description |
|-------|-------------|
| `processed` | Background job/queue processing |
| `synced` | Data synchronization occurred |
| `indexed` | Search/cache index updated |
| `expired` | Cache/session expiration |
| `scheduled` | Future task scheduled |

### Naming Decision Tree

```
Is this a user action?
├─ YES → Use {object}_{user_action}
│         Verb MUST be from controlled user action list
│         Example: search_result_clicked
│
└─ NO → Is this part of a request cycle?
    ├─ YES → Use {object}_request_{stage} or {object}_{stage}
    │         Stage MUST be from request stage list
    │         Example: search_request_received, search_page_rendered
    │
    └─ NO → Is this a background/system event?
        └─ YES → Use system_{object}_{stage}
                  Stage MUST be from system stage list
                  Example: system_inventory_synced
```

### Examples

✅ **Correct**:
```
# User action events
search_result_clicked           # User clicked result
product_viewed                  # User viewed product
form_submitted                  # User submitted form
search_query_typed              # User typed in search

# Request cycle events
search_request_received         # Backend received request
search_request_completed        # Backend completed request
search_page_rendered            # SSR render completed
search_page_hydration           # Client hydration completed
order_request_failed            # Order processing failed

# System/background events
system_inventory_synced         # Background sync job
system_cache_expired            # Cache expiration
system_email_processed          # Email queue processing
```

❌ **Incorrect**:
```
SearchResultClicked             # camelCase (use snake_case)
search-result-clicked           # kebab-case (use snake_case)
click_search_result             # action-first order
search_api_request_receive      # "receive" not past tense (use 'received')
search_page_hydrated            # "hydrated" is not a stage (use 'hydration')
search_updated                  # ambiguous - user action or request stage?
inventory_synced                # missing system_ prefix (use 'system_inventory_synced')
search_result_modified          # "modified" not in user action list (use 'typed' or 'updated')
```

---

## Property Conventions

### Type Prefixes (REQUIRED)

Properties must use prefixes that indicate their type:

| Prefix | Type | Example |
|--------|------|---------|
| `is_`, `has_`, `should_` | Boolean | `is_prefetch`, `has_discount` |
| `num_` | Numeric count | `num_results`, `num_retries` |
| `total_` | Numeric sum/aggregate | `total_price`, `total_items` |
| _(none)_ | String/ID | `request_id`, `search_query` |
| `{name}_ms` | Millisecond duration | `query_time_ms`, `time_to_hydrate_ms` |
| `{name}_at` | Timestamp (ISO 8601) | `created_at`, `completed_at` |

### Property Naming Rules

- **Format**: snake_case only
- **Consistency**: Same concept = same name across all events
  - ✅ Always use `request_id` (not `requestId`, `req_id`, `request_identifier`)
  - ✅ Always use `search_query` (not `query`, `search_term`, `q`)
- **Specificity**: Prefix generic names with context
  - ❌ `count` (ambiguous)
  - ✅ `results_count`, `items_count`, `retry_count`
- **No Abbreviations**: Use full words
  - ❌ `ts`, `req`, `usr`
  - ✅ `timestamp`, `request_id`, `user_id`

### Core Required Properties by Event Type

#### A. Frontend Events

All frontend events MUST include:

```json
{
  // Universal properties
  "timestamp": "2026-02-17T10:00:00.250Z",
  "event_name": "search_result_clicked",

  // Request correlation
  "request_id": "abc-123",
  "session_id": "session-789",

  // User identification
  "user_id": "user-456",
  "device_id": "device-123",
  "cookie_id": "cookie-xyz",

  // Client context
  "user_agent": "Mozilla/5.0 ...",
  "ip_address": "192.168.1.1",

  // Page context (REQUIRED for frontend)
  "page": "/search",
  "action": "result_click",

  // Viewport context (REQUIRED for frontend)
  "viewport_width": 1920,
  "viewport_height": 1080,
  "screen_width": 1920,
  "screen_height": 1080,
  "device_pixel_ratio": 2.0
}
```

#### B. Backend Events (Request Cycle)

Backend events occurring during user request cycles MUST include:

```json
{
  // Universal properties
  "timestamp": "2026-02-17T10:00:00.250Z",
  "event_name": "search_api_request_received",

  // Request correlation
  "request_id": "abc-123",
  "session_id": "session-789",

  // User identification
  "user_id": "user-456",

  // Client context blob (from headers)
  "client_context": {
    "device_id": "device-123",
    "cookie_id": "cookie-xyz",
    "user_agent": "Mozilla/5.0 ...",
    "ip_address": "192.168.1.1"
  },

  // Backend context
  "service": "search-service",
  "endpoint": "/api/search"
}
```

**Client Context Blob**: Clients MUST pass context via HTTP headers:

```http
X-Request-ID: abc-123
X-Session-ID: session-789
X-Device-ID: device-123
X-Cookie-ID: cookie-xyz
User-Agent: Mozilla/5.0 ...
```

Backend services extract these headers and construct the `client_context` object.

#### C. Backend Events (System/Non-Request Cycle)

System events (prefixed with `system_`) occurring outside user request cycles:

```json
{
  // Universal properties
  "timestamp": "2026-02-17T10:00:00.250Z",
  "event_name": "system_inventory_synced",

  // System context
  "service": "pricing-service",
  "job_id": "sync-job-456",
  "trigger": "scheduled"
}
```

**Note**: System events should NOT include:
- `request_id` (not part of request cycle)
- `client_context` (not user-initiated)

### Property Examples

✅ **Correct**:
```json
{
  "request_id": "abc-123",
  "search_query": "laptop",
  "is_prefetch": false,
  "num_results": 47,
  "total_price": 9999,
  "query_time_ms": 150,
  "created_at": "2026-02-17T10:00:00.250Z"
}
```

❌ **Incorrect**:
```json
{
  "requestId": "abc-123",           // camelCase
  "query": "laptop",                // inconsistent naming
  "prefetch": false,                // missing is_ prefix
  "results": 47,                    // ambiguous (array or count?)
  "price": 9999,                    // missing total_ prefix
  "queryTime": 150,                 // missing _ms suffix
  "ts": "2026-02-17T10:00:00.250Z"  // abbreviation
}
```

---

## Event Versioning

### Approach: Property-Based Versioning

**Rule**: Event versions are tracked via a `schema_version` property, NOT in the event name.

```json
{
  "event_name": "search_api_request_received",
  "schema_version": 2,
  "request_id": "abc-123"
}
```

### When to Increment Version

- **Breaking changes**: Removing properties, changing property types, renaming properties → Increment version
- **Non-breaking changes**: Adding optional properties → NO version increment

### Version Migration

When introducing breaking changes:

1. Add `schema_version` property with incremented value
2. Support previous version for **2 quarters minimum**
3. Document changes in `CHANGELOG.md` under `## Event Schema Changes`
4. Add deprecation warnings to analytics pipeline for old versions

### Versioning Examples

#### Breaking Change: Renamed Property

```json
// v1 (deprecated)
{
  "event_name": "order_placed",
  "schema_version": 1,
  "order_total": 9999
}

// v2 (current)
{
  "event_name": "order_placed",
  "schema_version": 2,
  "total_price": 9999  // renamed to follow total_ prefix convention
}
```

#### Non-Breaking Change: Added Optional Property

```json
// Before
{
  "event_name": "search_result_clicked",
  "schema_version": 1,
  "product_id": "xyz-789"
}

// After (schema_version unchanged)
{
  "event_name": "search_result_clicked",
  "schema_version": 1,
  "product_id": "xyz-789",
  "result_rank": 0.85  // New optional property
}
```

---

## Change Management

### Proposing New Events

1. Open PR with event implementation
2. Add entry to `EVENT_CATALOG.md` with:
   - Event name
   - Description (when it fires)
   - All properties with types and descriptions
   - Example payload
3. PR must pass automated validation (see below)
4. Requires approval from analytics team

### Modifying Existing Events

#### Non-Breaking Changes (adding optional properties)
- Standard PR review process
- Update `EVENT_CATALOG.md` with new properties
- No version change required

#### Breaking Changes (removing/renaming properties)
- Requires `schema_version` increment
- Must document migration in `CHANGELOG.md`
- Support previous version for 2 quarters minimum
- Notify analytics team and downstream consumers

### Automated Validation (PR Stage)

All PRs that add/modify analytics calls must pass validation:

```bash
# Validate event names
npm run validate:event-names

# Validate properties
npm run validate:event-properties

# Validate consistency across codebase
npm run validate:event-consistency
```

#### Validation Checks

**1. Event Naming**:
- Event names follow `{object}_{action}` or `system_{object}_{action}` pattern
- Past tense only
- Verbs from controlled vocabulary
- snake_case format

**2. Property Validation**:
- All properties use snake_case
- Type prefixes present where required (`is_`, `num_`, `*_ms`, etc.)
- Required core properties present based on event type
- No abbreviations

**3. Consistency Validation**:
- Same property names used consistently across events
- Property types consistent (e.g., `request_id` always string)

---

## Client Implementation Requirements

### HTTP Headers (All Clients)

All clients (web, iOS, Android) MUST pass client context via HTTP headers on every API request:

```http
X-Request-ID: <uuid>          # Generated per-request (UUID v4)
X-Session-ID: <uuid>          # Persistent per session
X-Device-ID: <uuid>           # Persistent per device
X-Cookie-ID: <uuid>           # Browser cookie identifier (web only)
User-Agent: <string>          # Standard User-Agent header
```

### Web Client Example

```typescript
// lib/api-client.ts
export async function apiRequest(endpoint: string, options?: RequestInit) {
  const headers = {
    'X-Request-ID': generateRequestId(),
    'X-Session-ID': getSessionId(),  // From localStorage
    'X-Device-ID': getDeviceId(),    // From localStorage
    'X-Cookie-ID': getCookieId(),    // From cookie
    'User-Agent': navigator.userAgent,
    ...options?.headers,
  };

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
}
```

### Backend Extraction Example

```typescript
// middleware/client-context.ts
export function extractClientContext(req: Request): ClientContext {
  return {
    device_id: req.headers['x-device-id'] as string,
    cookie_id: req.headers['x-cookie-id'] as string,
    user_agent: req.headers['user-agent'] as string,
    ip_address: (req.ip || req.headers['x-forwarded-for']) as string,
  };
}

// Usage in controller
analytics.track({
  name: 'search_api_request_received',
  properties: {
    timestamp: new Date().toISOString(),
    event_name: 'search_api_request_received',
    request_id: req.headers['x-request-id'],
    session_id: req.headers['x-session-id'],
    user_id: req.user?.id || null,
    client_context: extractClientContext(req),
    service: 'search-service',
    endpoint: req.path,
  },
});
```

---

## Complete Event Examples

### Frontend Event

```json
{
  "timestamp": "2026-02-17T10:00:03.200Z",
  "event_name": "search_result_clicked",
  "schema_version": 1,

  "request_id": "abc-123",
  "session_id": "session-789",

  "user_id": "user-456",
  "device_id": "device-123",
  "cookie_id": "cookie-xyz",

  "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...",
  "ip_address": "192.168.1.1",

  "page": "/search",
  "action": "result_click",

  "viewport_width": 1920,
  "viewport_height": 1080,
  "screen_width": 1920,
  "screen_height": 1080,
  "device_pixel_ratio": 2.0,

  "search_query": "laptop",
  "product_id": "xyz-789",
  "result_position": 2,
  "result_rank": 0.85
}
```

### Backend Request Cycle Event

```json
{
  "timestamp": "2026-02-17T10:00:00.250Z",
  "event_name": "search_api_request_received",
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
  "is_prefetch": false,
  "num_filters": 2,
  "cache_key": "search:laptop:electronics"
}
```

### Backend System Event

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

## Summary

### Key Principles

1. **Language-agnostic**: Standards apply regardless of implementation language
2. **Automated enforcement**: Validation runs in CI/CD pipelines
3. **Consistent naming**: Same concepts use same names everywhere
4. **Client context**: Request cycle events include full client context
5. **System separation**: Background events clearly marked with `system_` prefix

### Quick Reference

| Aspect | Rule |
|--------|------|
| Event naming | `{object}_{action}` in snake_case, past tense |
| Controlled verbs | MUST use approved verbs from list |
| System events | Prefix with `system_`, no client context |
| Property naming | snake_case with type prefixes |
| Frontend required | page, action, viewport properties |
| Backend required | client_context blob from headers |
| Versioning | `schema_version` property, not in name |
| Breaking changes | Increment version, support 2 quarters |

---

**Last Updated**: 2026-02-17
