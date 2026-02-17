# Client Context Infrastructure

This package provides shared utilities for consistent client context capture across all frontend and backend services.

## Overview

The client context infrastructure ensures that all analytics events include consistent user identification and context properties, following the standards defined in `INSTRUMENTATION_STANDARDS.md`.

---

## Frontend Usage

### 1. Client IDs

Use these utilities to get or create persistent identifiers:

```typescript
import { getSessionId, getDeviceId, getCookieId, getClientIds } from '@marketplace/shared';

// Individual IDs
const sessionId = getSessionId();     // Session storage (browser session)
const deviceId = getDeviceId();       // Local storage (persists)
const cookieId = getCookieId();       // Cookie (1 year, server-accessible)

// All at once
const { session_id, device_id, cookie_id } = getClientIds();
```

### 2. Viewport Information

```typescript
import { getViewportInfo } from '@marketplace/shared';

const viewport = getViewportInfo();
// Returns: { viewport_width, viewport_height, screen_width, screen_height, device_pixel_ratio }
```

### 3. Frontend Event Example

```typescript
import { getClientIds, getViewportInfo } from '@marketplace/shared';

analytics.track({
  name: 'search_result_clicked',
  properties: {
    // Universal
    timestamp: new Date().toISOString(),
    event_name: 'search_result_clicked',
    schema_version: 1,

    // Correlation
    request_id: requestId,  // From SSR or generated
    ...getClientIds(),      // session_id, device_id, cookie_id

    // User
    user_id: currentUser?.id || null,

    // Client context
    user_agent: navigator.userAgent,
    ip_address: null,  // Not available client-side

    // Page context (required for frontend)
    page: window.location.pathname,
    action: 'result_click',

    // Viewport (required for frontend)
    ...getViewportInfo(),

    // Event-specific
    product_id: 'xyz-789',
    result_position: 2,
  },
});
```

---

## Backend Usage

### 1. Extract Client Context

Use this in your request handlers:

```typescript
import { extractClientContext, extractCorrelationIds } from '@marketplace/shared';

export async function handleSearch(req: Request, res: Response) {
  const clientContext = extractClientContext(req);
  const { request_id, session_id, trace_id } = extractCorrelationIds(req);

  analytics.track({
    name: 'search_request_received',
    properties: {
      // Universal
      timestamp: new Date().toISOString(),
      event_name: 'search_request_received',
      schema_version: 1,

      // Correlation
      request_id,
      session_id,
      trace_id,

      // User
      user_id: req.user?.id || null,

      // Client context (required for backend request cycle)
      client_context: clientContext,

      // Backend context (required)
      service: 'search-service',
      endpoint: req.path,

      // Event-specific
      search_query: req.query.q,
    },
  });
}
```

### 2. Client Context Structure

The `extractClientContext()` function returns:

```typescript
interface ClientContext {
  device_id: string;      // From X-Device-ID header
  cookie_id: string;      // From X-Cookie-ID header or cookie
  user_agent: string;     // From User-Agent header
  ip_address: string;     // From X-Forwarded-For, X-Real-IP, or direct IP
}
```

---

## Client → Backend Flow

### Frontend: Send Headers

Frontend applications should send client context on every API request:

```typescript
// Example API client wrapper
export async function apiRequest(endpoint: string, options?: RequestInit) {
  const { session_id, device_id, cookie_id } = getClientIds();

  const headers = {
    'X-Request-ID': crypto.randomUUID(),  // Generate fresh per request
    'X-Session-ID': session_id,
    'X-Device-ID': device_id,
    'X-Cookie-ID': cookie_id,
    'User-Agent': navigator.userAgent,
    ...options?.headers,
  };

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
}
```

### Backend: Extract Headers

Backend services extract the headers into the `client_context` object:

```typescript
import { extractClientContext } from '@marketplace/shared';

const clientContext = extractClientContext(req);
// clientContext is now ready to include in analytics events
```

---

## TypeScript Types

The package exports TypeScript interfaces for type safety:

```typescript
import type {
  BaseEventProperties,
  FrontendEventProperties,
  BackendRequestEventProperties,
  BackendSystemEventProperties,
  ClientContext,
  ViewportInfo,
} from '@marketplace/shared/types';
```

---

## Required Headers

### Frontend Must Send

| Header | Source | Example |
|--------|--------|---------|
| `X-Request-ID` | Generated per request | `crypto.randomUUID()` |
| `X-Session-ID` | `getSessionId()` | `"a1b2c3d4-..."` |
| `X-Device-ID` | `getDeviceId()` | `"e5f6g7h8-..."` |
| `X-Cookie-ID` | `getCookieId()` | `"i9j0k1l2-..."` |
| `User-Agent` | Browser | `navigator.userAgent` |

### Backend Extracts

| Property | Extracted From | Fallback |
|----------|----------------|----------|
| `device_id` | `X-Device-ID` header | Empty string |
| `cookie_id` | `X-Cookie-ID` header or cookie | Empty string |
| `user_agent` | `User-Agent` header | Empty string |
| `ip_address` | `X-Forwarded-For`, `X-Real-IP`, or `req.ip` | Empty string |

---

## Event Type Requirements

### Frontend Events
✅ **Must include**: `page`, `action`, viewport properties  
✅ **Use**: `getClientIds()`, `getViewportInfo()`

### Backend Request Cycle Events
✅ **Must include**: `client_context`, `service`, `endpoint`  
✅ **Use**: `extractClientContext()`, `extractCorrelationIds()`

### Backend System Events
❌ **Must NOT include**: `client_context`, `request_id`  
✅ **Must include**: `service`, `job_id`, `trigger`

---

## Testing

You can test the utilities:

```typescript
// Frontend test
import { getSessionId, getDeviceId } from '@marketplace/shared';

const session1 = getSessionId();
const session2 = getSessionId();
console.assert(session1 === session2, 'Session ID should be stable');

// Backend test
import { extractClientContext } from '@marketplace/shared';

const mockReq = {
  headers: {
    'x-device-id': 'test-device',
    'x-cookie-id': 'test-cookie',
    'user-agent': 'Test Agent',
  },
  ip: '127.0.0.1',
};

const context = extractClientContext(mockReq);
console.assert(context.device_id === 'test-device');
```

---

## See Also

- [INSTRUMENTATION_STANDARDS.md](../../INSTRUMENTATION_STANDARDS.md) - Full standards
- [EVENT_CATALOG.md](../../EVENT_CATALOG.md) - Event examples
- [VALIDATION_GUIDE.md](../../VALIDATION_GUIDE.md) - How to validate events
