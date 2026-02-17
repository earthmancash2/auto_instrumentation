# SSR Instrumentation Validation Report

**Generated**: 2026-02-17
**Branch**: ssr-instrumentation
**Status**: ⚠️ Needs Updates

---

## Summary

The SSR instrumentation was created **before** the formal standards were established. Now that we have comprehensive standards, the existing instrumentation needs updates to comply fully.

**Results**:
- ✅ 3/7 events have compliant names
- ❌ 4/7 events need name updates (verbs not in controlled list)
- ❌ Backend events missing `client_context` blob
- ❌ Frontend events missing required properties

---

## Event Name Validation

### ✅ Passes Standards

| Event Name | Verb | Location |
|------------|------|----------|
| `search_api_request_received` | received ✅ | services/search-service/src/controllers/search-controller.ts:66 |
| `search_api_request_completed` | completed ✅ | services/search-service/src/controllers/search-controller.ts:104, 169 |
| `search_api_request_failed` | failed ✅ | services/search-service/src/controllers/search-controller.ts:227 |
| `search_result_clicked` | clicked ✅ | apps/marketplace-web/src/pages/search.tsx:102 |

### ❌ Fails Standards

| Event Name | Issue | Suggested Fix | Location |
|------------|-------|---------------|----------|
| `search_page_hydrated` | Verb "hydrated" not in controlled list | Use existing verb or add "hydrated" to list | apps/marketplace-web/src/pages/search.tsx:44 |
| `search_query_modified` | Verb "modified" not in controlled list | Change to `search_query_typed` or `search_query_updated` | apps/marketplace-web/src/pages/search.tsx:81 |

**Recommendation**: Add "hydrated" to controlled verb list for frontend hydration events. This is a common web pattern.

---

## Property Validation

### Backend Events (Search Service)

#### ❌ Missing Required Properties

All backend request cycle events are **missing**:

```typescript
// MISSING:
client_context: {
  device_id: string,
  cookie_id: string,
  user_agent: string,
  ip_address: string
}
service: string,  // e.g., "search-service"
endpoint: string, // e.g., "/api/search"
```

**Current structure** (search_api_request_received):
```typescript
{
  request_id: requestId,        // ✅ Present
  search_id: searchId,          // ✅ Present
  session_id: sessionId,        // ✅ Present
  trace_id: traceId,            // ✅ Present
  search_query: q,              // ✅ Present
  filters: {},                  // ✅ Present
  pagination: {},               // ✅ Present
  client_type: clientType,      // ⚠️ Should be in client_context
  client_version: clientVersion,// ⚠️ Should be in client_context
  is_prefetch: isPrefetch,      // ✅ Correct prefix
  is_retry: retryCount > 0,     // ✅ Correct prefix
  retry_count: retryCount,      // ✅ Correct prefix
  user_agent: req.headers['user-agent'], // ⚠️ Should be in client_context
  timestamp: new Date().toISOString(),   // ✅ Present
}
```

**Required updates**:
1. Extract client context from headers into `client_context` blob
2. Add `service: "search-service"`
3. Add `endpoint: req.path`
4. Move `client_type`, `client_version`, `user_agent` into `client_context`
5. Add `device_id` and `cookie_id` from headers

---

### Frontend Events

#### ❌ search_page_hydrated - Missing Required Properties

**Current structure**:
```typescript
{
  request_id: requestId,              // ✅ Present
  search_id: searchId,                // ✅ Present
  search_query: initialQuery,         // ✅ Present
  results_count: results.length,      // ⚠️ Should be num_results
  time_to_hydrate_ms: timeToHydrate,  // ✅ Correct suffix
  time_to_interactive_ms: performance.now(), // ✅ Correct suffix
  viewport_width: window.innerWidth,  // ✅ Present
  viewport_height: window.innerHeight,// ✅ Present
  connection_type: navigator.connection?.effectiveType || 'unknown', // ✅ Present
  page_type: 'search',                // ⚠️ Should be page: '/search'
  render_type: 'ssr_hydration',       // ❌ Not in standards
  timestamp: new Date().toISOString(),// ✅ Present
}
```

**Missing required properties**:
```typescript
session_id: string,           // MISSING
user_id: string,              // MISSING
device_id: string,            // MISSING
cookie_id: string,            // MISSING
user_agent: string,           // MISSING
ip_address: string,           // MISSING (null for client-side)
page: string,                 // MISSING (has page_type instead)
action: string,               // MISSING
screen_width: number,         // MISSING
screen_height: number,        // MISSING
device_pixel_ratio: number,   // MISSING
event_name: string,           // MISSING
schema_version: number,       // MISSING
```

**Property naming issues**:
- `results_count` → Should be `num_results` (numeric count needs num_ prefix)
- `page_type: 'search'` → Should be `page: '/search'` (actual page path)
- `render_type` → Not in standards, can be removed or kept as extra context

---

#### ❌ search_query_modified - Similar Issues

Same missing properties as search_page_hydrated, plus:
- Event name needs updating (see above)

---

#### ✅ search_result_clicked - Mostly Compliant

Missing same core properties (session_id, device_id, etc.) but structure is otherwise good.

---

## Type Prefix Validation

### ✅ Correct Usage

- `is_prefetch: boolean` ✅
- `is_retry: boolean` ✅
- `retry_count: number` ✅
- `time_to_hydrate_ms: number` ✅
- `time_to_interactive_ms: number` ✅
- `viewport_width: number` ✅

### ❌ Incorrect Usage

- `results_count` → Should be `num_results` (missing num_ prefix)

---

## Required Updates Summary

### 1. Add Missing Verbs to Controlled List

Add to `INSTRUMENTATION_STANDARDS.md`:

```markdown
#### User Actions (Frontend)
- `hydrated` - Component/page hydration completed
```

### 2. Update Backend Events

File: `services/search-service/src/controllers/search-controller.ts`

**Changes needed**:
```typescript
// Add middleware to extract client context
const clientContext = {
  device_id: req.headers['x-device-id'] as string,
  cookie_id: req.headers['x-cookie-id'] as string,
  user_agent: req.headers['user-agent'] as string,
  ip_address: req.ip || req.headers['x-forwarded-for'] as string,
};

analytics.track({
  name: 'search_api_request_received',
  properties: {
    // Universal
    timestamp: new Date().toISOString(),
    event_name: 'search_api_request_received',
    schema_version: 1,

    // Correlation
    request_id: requestId,
    search_id: searchId,
    session_id: sessionId,
    trace_id: traceId,

    // User
    user_id: req.user?.id || null,

    // Client context (NEW)
    client_context: clientContext,

    // Backend context (NEW)
    service: 'search-service',
    endpoint: req.path,

    // Query details
    search_query: q,
    filters,
    pagination,

    // Flags
    is_prefetch: isPrefetch,
    is_retry: retryCount > 0,
    retry_count: retryCount,
  },
});
```

### 3. Update Frontend Events

File: `apps/marketplace-web/src/pages/search.tsx`

**Changes needed**:
```typescript
import { getSessionId, getDeviceId, getCookieId } from '@/lib/client-ids';

// In component
analytics.track({
  name: 'search_page_hydrated',
  properties: {
    // Universal (NEW)
    timestamp: new Date().toISOString(),
    event_name: 'search_page_hydrated',
    schema_version: 1,

    // Correlation
    request_id: requestId,
    search_id: searchId,
    session_id: getSessionId(), // NEW

    // User identification (NEW)
    user_id: currentUser?.id || null,
    device_id: getDeviceId(),
    cookie_id: getCookieId(),

    // Client context (NEW)
    user_agent: navigator.userAgent,
    ip_address: null, // Not available client-side

    // Page context (UPDATED)
    page: window.location.pathname, // Changed from page_type
    action: 'page_hydration', // NEW

    // Viewport context (EXPANDED)
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    screen_width: window.screen.width, // NEW
    screen_height: window.screen.height, // NEW
    device_pixel_ratio: window.devicePixelRatio, // NEW

    // Query context
    search_query: initialQuery,
    num_results: results.length, // Renamed from results_count

    // Timing
    time_to_hydrate_ms: timeToHydrate,
    time_to_interactive_ms: performance.now(),

    // Optional
    connection_type: (navigator as any).connection?.effectiveType || 'unknown',
  },
});
```

### 4. Create Client ID Utilities

File: `apps/marketplace-web/src/lib/client-ids.ts` (NEW)

```typescript
export function getSessionId(): string {
  let sessionId = sessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}

export function getDeviceId(): string {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

export function getCookieId(): string {
  const cookies = document.cookie.split('; ');
  const cookieIdCookie = cookies.find(c => c.startsWith('cookie_id='));
  if (cookieIdCookie) {
    return cookieIdCookie.split('=')[1];
  }
  const newCookieId = crypto.randomUUID();
  document.cookie = `cookie_id=${newCookieId}; path=/; max-age=31536000`;
  return newCookieId;
}
```

### 5. Update API Client to Send Headers

File: `apps/marketplace-web/src/lib/api-client.ts` (or create)

```typescript
import { getSessionId, getDeviceId, getCookieId } from './client-ids';

export async function apiRequest(endpoint: string, options?: RequestInit) {
  const headers = {
    'X-Request-ID': crypto.randomUUID(),
    'X-Session-ID': getSessionId(),
    'X-Device-ID': getDeviceId(),
    'X-Cookie-ID': getCookieId(),
    'User-Agent': navigator.userAgent,
    ...options?.headers,
  };

  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    headers,
  });
}
```

---

## Validation After Updates

Once updates are complete, run:

```bash
npm run validate:events
```

Expected result: ✅ All validations pass

---

## Recommendations

1. **Phase 1: Add "hydrated" verb**
   - Update `INSTRUMENTATION_STANDARDS.md`
   - Update `scripts/validate-naming.js` controlled verb list
   - Commit: "Add 'hydrated' to controlled verb list"

2. **Phase 2: Update backend events**
   - Add client context extraction middleware
   - Update all 3 search service events
   - Test with actual requests
   - Commit: "Update search service events to follow standards"

3. **Phase 3: Update frontend events**
   - Create client ID utilities
   - Update all 3 frontend events
   - Update API client to send headers
   - Test in browser
   - Commit: "Update frontend events to follow standards"

4. **Phase 4: Validate**
   - Run validation scripts
   - Fix any remaining issues
   - Commit: "Fix remaining validation issues"

5. **Phase 5: Update documentation**
   - Update EVENT_CATALOG.md with complete property lists
   - Update SSR_INSTRUMENTATION.md with new structure
   - Commit: "Update documentation to reflect standards"

---

## Impact Assessment

**Breaking Changes**: Yes
- Property structure changes (client_context blob)
- Property renames (results_count → num_results)
- New required properties

**Backward Compatibility**: No
- Existing analytics queries may break
- Need to update downstream consumers

**Migration Path**:
1. Deploy updated instrumentation with `schema_version: 2`
2. Support v1 and v2 in analytics pipeline for 2 quarters
3. Migrate queries to use v2 structure
4. Deprecate v1 after 2 quarters

---

## Conclusion

The SSR instrumentation demonstrates excellent patterns for:
- ✅ Request correlation (request_id, search_id)
- ✅ Event layering (backend → SSR → client)
- ✅ Timing metrics (time_to_hydrate_ms)

However, it predates the formal standards and needs updates for:
- ❌ Client context blob structure
- ❌ Required frontend properties
- ❌ Property naming consistency
- ❌ Schema versioning

These updates will make the instrumentation fully standards-compliant and ready for production use.
