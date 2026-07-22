---
description: Single source of truth for API-related development in this app (React Native CLI, not Expo). Follow these conventions instead of re-analyzing the codebase for every new API task.
alwaysApply: false
globs:
  - "app/modules/**/services/**"
  - "app/config/api.ts"
  - "app/shared/services/**"
  - "app/shared/utils/**"
---

# API Rules — vfcomr

Stack: React Native CLI + TypeScript, `axios`, `@react-native-async-storage/async-storage`, `formik`/`yup`, `@react-native-community/netinfo`. No React Query/SWR/Redux/Zustand. No repository layer, no DTO mapper layer.

This document is the **only** reference needed for API work. Do not re-derive architecture from scratch — extend the patterns below.

---

## 1. API Layer

### Folder structure
- Single Axios client: `app/config/api.ts` (default export `api`).
- Per-feature services: `app/modules/<feature>/services/<feature>.service.ts` (e.g. `app/modules/country/services/country.service.ts`).
- Cross-cutting API-ish utilities: `app/shared/utils/` (e.g. `permissions.ts` for RBAC, `downloadImage.ts`, `networkEvents.ts`).
- Cross-cutting non-API device services: `app/shared/services/permissions.service.ts` (camera/photo/location/notification permissions — **not** related to API auth).
- No `models/`, `dto/`, or `repositories/` directories exist. Do not introduce them.

### File naming conventions
- Service file: `<feature>.service.ts` (lowerCamel or lower feature name, singular), one per domain module.
- Exported functions: verb + noun, `camelCase` — `listCountries`, `getChurchDetail`, `createFAQ`, `updateVisit`, `deleteUser`, `uploadImage`.
- Types/interfaces: co-located in the same service file as the functions that use them (no separate `types.ts`). Use `PascalCase`.

### Service organization
- **Plain exported async functions**, not classes, not a repository pattern.
- One service file per resource/domain. All request/response typing for that domain lives in the same file.
- Prefer calling through a service function from screens/hooks. Directly importing `app/config/api` from a screen is a legacy pattern found in older/complex screens (e.g. `AddChurchScreen`, `EditChurchScreen`) — **do not extend this**; add a service function instead for any new endpoint.

### Repository pattern
- **Not used.** Services call `api` directly and return response data. Do not introduce a repository abstraction layer.

### API client configuration
File: `app/config/api.ts`

```ts
const api = axios.create({
  baseURL: 'http://34.126.158.119/api/v1/',
  headers: { 'Content-Type': 'application/json' },
});
```

- Import and use this single `api` instance for all HTTP calls. Never call `axios` directly or create a second instance.
- `DEFAULT_PAGE_LIMIT = 10` is exported from this file — reuse it for pagination defaults instead of hardcoding `10` elsewhere.

### Base URL handling
- Hardcoded in `app/config/api.ts` (`baseURL`). There is no `.env`/environment switching today. If you need per-environment URLs, that is an architecture change — flag it rather than silently hardcoding a second URL.
- The file storage host (`http://34.126.158.119/storage`) is a **separate** hardcoded constant defined locally in screens that display uploaded images (e.g. `UserListScreen.tsx`). Reuse the same literal string convention if you need it elsewhere (do not invent a new env system for this).

### Authentication flow
- Token is stored in `AsyncStorage` under the key `'token'` (see `app/modules/auth/services/auth.service.ts`).
- Login (`login()`) posts to `/login`, stores `token` via `AsyncStorage.setItem('token', token)`, and resolves/stores a default church (`selectedChurchId`, `selectedChurchName`, `selectedChurchCountryName`).
- Logout (`logout()`) removes `token`, `selectedChurchId`, `selectedChurchName`, `selectedChurchCountryName` from `AsyncStorage`.
- Session/route guard: `app/config/navigation.tsx` checks `AsyncStorage.getItem('token')` on mount to decide whether to show the `Login` stack or the authenticated stack. `AuthContext` only exposes `{ isAuthenticated, setIsAuthenticated }` — no user object is stored in context.
- Current user profile is fetched ad hoc via `GET users/me` wherever needed (e.g. `getUserProfile()` in `app/shared/config/dashboard.constants.ts`, `Header.tsx`). There is no shared "current user" hook/context yet — reuse `getUserProfile()` instead of writing a new `users/me` call.
- Client-side RBAC (role checks) lives in `app/shared/utils/permissions.ts` (`ROLES`, `isSuperAdmin`, `isOverseer`, `isPastorLeader`, `resolveRoleIdFromUser`). Reuse these helpers instead of comparing role IDs inline.

### Header conventions
- `Content-Type: application/json` is the default (set at client creation).
- The **request interceptor** in `api.ts` automatically injects on every request:
  - `Authorization: Bearer <token>` (from `AsyncStorage` `'token'`, or `TOKEN_FOR_TEST` override if set — never commit a non-empty `TOKEN_FOR_TEST`).
  - `Accept-Language: <appLanguage>` (from `AsyncStorage` key `'appLanguage'`, default `'en'`).
- **Do not manually set `Authorization` in a new service** — the interceptor already does it. (Some older services duplicate this manually; that's redundant legacy code, not the pattern to copy.)
- For multipart uploads, override `Content-Type: multipart/form-data` per-request (see §2 Multipart upload).

### Token refresh strategy
- **None exists.** There is no refresh-token endpoint and no interceptor-based retry-on-401. A 401 simply surfaces as an error to the caller (handled today only in the login screen). Do not assume refresh-token infrastructure exists when writing new code.

### Timeout configuration
- **Not configured** on the Axios instance (no `timeout` option set). If a specific endpoint needs a timeout, pass `{ timeout: <ms> }` in that request's config rather than changing the shared instance, unless asked to change global behavior.

---

## 2. Request Rules

### How to create a new endpoint
1. Identify (or create) the feature's service file: `app/modules/<feature>/services/<feature>.service.ts`.
2. Define request/response TypeScript interfaces in that same file (`XxxPayload`, `ListXxxParams`, `ListXxxResponse`, `XxxItem`).
3. Write an exported async function named `list/get/create/update/delete<Xxx>` that calls `api.<verb>(...)` and returns `response.data` (see §3 for envelope shape).
4. Do not manually attach `Authorization` — the interceptor handles it. Only read `AsyncStorage` token directly if you need to guard/throw before making the call (existing pattern in a few services, but not required for new ones since the interceptor covers auth).
5. Call the service function from a screen/hook using local `useState`/`useEffect` (see §5 State Management) — do not introduce a new data-fetching library for a single feature.

### GET/POST/PUT/PATCH/DELETE conventions
- `GET` — lists, detail, `users/me`, chart/aggregate data.
- `POST` — create, login, bulk-create (e.g. `/visits/bulk`).
- `PATCH` — update, and partial-state toggles (e.g. `/churches/{id}/disable`).
- `DELETE` — delete by id.
- `PUT` — not used in this codebase; use `PATCH` for updates to stay consistent.
- Path style: prefer a **leading slash** (`api.get('/countries')`) for new endpoints for consistency, even though both styles exist historically (baseURL already ends in `/`).

### Query parameters
Pass as the Axios `params` object, not string-concatenated into the URL:

```ts
const response = await api.get<ListCountriesResponse>('/countries', {
  params: { page, limit, name },
});
```

### Path parameters
Interpolate directly into the template string: `api.get(`/churches/${id}`)`, `api.patch(`/churches/${id}/disable`)`.

### Multipart upload
Reuse the pattern from `app/modules/user/services/user.service.ts` (`uploadImage`):

```ts
const formData = new FormData();
formData.append('file', { uri: image.path, type: image.mime || 'image/jpeg', name: fileName });
formData.append('entity_type', 'users');
const response = await api.post<ImageUploadResponse>('images/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

### Pagination
Standard request params: `page` (1-based), `limit` (default `DEFAULT_PAGE_LIMIT` from `app/config/api.ts`). Standard response metadata shape to type your response interfaces against:

```ts
{ items: T[]; total: number; page: number; limit: number; total_pages: number; has_next: boolean; has_previous: boolean }
```

Use page-number pagination for main list screens (see `Pagination` component). Use `has_next` + `onEndReached` only for dropdown/infinite-style selectors, not full list screens.

### Search requests
Convention is inconsistent across existing endpoints — check the specific backend resource:
- Generic keyword search: `search` param (e.g. users, churches, goal-periods).
- Name-specific search: `name` param (e.g. countries, languages).
Match whatever the target endpoint already expects; don't invent a third convention.

### Sorting
`sort_by` (field name string) and `sort_desc` (boolean) query params where supported.

### Filtering
Pass additional boolean/enum filters as extra keys in the same `params` object (e.g. `disabled` for churches). Keep filter params flat, not nested objects.

---

## 3. Response Rules

### Response model structure
Standard envelope returned by the backend:

```json
{ "success": true, "data": { ... }, "message": "Request was successful" }
```

Type it explicitly, e.g.:

```ts
interface ListCountriesResponse {
  success: boolean;
  data: { items: CountryItem[]; total: number; page: number; limit: number; total_pages: number; has_next: boolean; has_previous: boolean };
  message: string;
}
```

### DTO mapping
- **No dedicated mapper/DTO layer.** Do not add one for a single feature. If the raw response shape is inconsistent (some backends return a bare array instead of the envelope), normalize inline in the service function — see `listChurchTypes()` in `app/modules/churchtype/services/churchtype.service.ts` and `normalizeResourceItems()` in `app/modules/resources/services/resource.service.ts` as the reference pattern for defensive normalization.
- Return either the full envelope (`return response.data`) or the unwrapped payload (`return response.data.data`) — pick whichever the calling screen needs, but be consistent within one service file.

### Model naming
- `*Response` — full API response type (`ListUsersResponse`).
- `*Payload` — request body type for create/update (`CreateCountryPayload`).
- `*Item` — a single entity in a list (`ChurchListItem`, `FAQItem`).
- No `*Dto` suffix is used — don't introduce it.

### Null handling
Mark optional/nullable API fields explicitly as `T | null` (not just optional `?`) when the backend can return `null`, matching existing payload interfaces (e.g. metrics fields in `monthlydata.service.ts`).

### Default values
When building save/update payloads, default missing fields to `null` explicitly (`value ?? null`) rather than omitting the key — follow `buildChurchMetricsPayload()` / `buildWorshipSessionsPayload()` in `app/modules/monthlydata/services/monthlydata.service.ts`.

### Enum handling
Use TypeScript string-literal unions for closed sets (e.g. `GoalMetricField` in `overseerGoals.service.ts`). Backend sends plain strings/numbers — no runtime enum decoding layer exists; don't add one.

### Date parsing
Type date fields as `string | null` (ISO strings) in interfaces; convert with `new Date(value)` at the point of use in the screen/component. There is no shared date-parsing utility — don't build one for a single feature.

---

## 4. Error Handling

### Standard error flow
- Axios response interceptor in `app/config/api.ts` normalizes any `AxiosError` into a plain `Error` carrying `status`, `code`, `response`, `config`, `request` — this happens automatically for every request; you don't need to handle it in services.
- In service functions: `console.error(...)` then either `throw error` as-is, or extract a friendlier message and `throw new Error(message)`:

```ts
const message = err?.response?.data?.message || err?.message || 'Create FAQ failed';
throw new Error(message);
```

- For richer backend validation payloads, follow `getApiErrorMessage()` in `app/modules/monthlydata/services/monthlydata.service.ts` (combines `data.message` and `data.errors.detail`).

### HTTP status handling
- No global status router exists. Handle status codes at the call site:
  - `401` → currently only handled in `useLoginForm.ts` (maps to `'invalidCredentials'` translation key). For new authenticated screens, a 401 today just surfaces as a generic error — there is no automatic logout/redirect. Don't assume one exists.
  - `403/404/500` → ad hoc per screen, typically surfaced via `Alert.alert(t('error'), message)`.

### Validation errors
Client-side validation via `formik` + `yup` (already a dependency) — validate before calling the API. Server-side validation errors come back in `response.data.message` / `response.data.errors` and should be surfaced via the same `getApiErrorMessage`-style extraction, not a new validation-error type.

### Unauthorized handling
No centralized handling. If a task requires global 401 handling, that's a deliberate new feature (add to the response interceptor in `app/config/api.ts`) — do not silently add it per-screen; ask before introducing.

### Retry policy
**None.** No automatic retries anywhere in the codebase. Don't add per-call retry loops unless explicitly requested.

### Offline behavior
- `@react-native-community/netinfo` is a dependency.
- `app/shared/utils/networkEvents.ts` exposes a `networkEventEmitter` used to trigger a reload (`route.params.reload`) when connectivity returns; screens opt in via `useFocusEffect` checking `route.params?.reload` (see `LanguagesScreen.tsx`).
- `NetworkReloadListener` (`app/shared/components/NetworkReloadListener.tsx`) is mounted in `navigation.tsx` and drives this. `NetworkStatusBanner` exists but is currently **not mounted** anywhere — don't assume it's visible to users unless you mount it.
- Reuse this reload-on-reconnect pattern for new list screens rather than writing new offline logic.

---

## 5. State Management

### How API data is stored
- **Local component state only** — `useState`/`useEffect`/`useCallback` in the screen/hook. No global store (no Redux/Zustand/Context for API data), except `MonthlyDataContext` which caches weekly-report form data in memory.
- Standard shape for a list screen:

```ts
const [items, setItems] = useState<T[]>([]);
const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [loading, setLoading] = useState(false);
const [refreshing, setRefreshing] = useState(false);

const fetchData = useCallback(async (targetPage: number) => {
  setLoading(true);
  try {
    const res = await listXxx({ page: targetPage, limit: DEFAULT_PAGE_LIMIT, search: query });
    setItems(res?.data?.items ?? []);
    setTotalPages(res?.data?.total_pages ?? 1);
  } catch (e) {
    console.error(e);
  } finally {
    setLoading(false);
  }
}, [query]);
```

### Refresh strategy
- Pull-to-refresh calls the same `fetchData` for page 1 with a `refreshing` flag (see §6 UI Rules).
- Reconnect-triggered refresh via `route.params?.reload` (see §4 Offline behavior).

### Cache rules
- **No HTTP cache layer.** If you need to avoid redundant fetches, follow the existing per-component patterns: `ListChurchScreen.tsx` keeps a `pages: Record<number, Item[]>` cache and a fetch-token guard to discard stale responses on rapid page changes. Copy this pattern only if a new list screen has the same rapid-pagination problem — don't build a generic cache utility speculatively.

### Loading state
`loading` boolean state per screen; disable pagination controls while `loading` (see `Pagination.tsx`).

### Empty state
Render `t('noDataFound')` (existing translation key) when `items.length === 0` and not loading.

### Error state
On fetch failure: `console.error(e)` and leave `items` empty (silent-fail is the current dominant pattern for list fetches). On mutation failure (create/update/delete): `Alert.alert(t('error'), message)`.

---

## 6. UI Rules

### Loading indicators
- `ActivityIndicator` for detail/simple screens.
- Skeleton loaders (custom `SkeletonCard` + shimmer) for list screens with a heavier first paint — see `ListChurchScreen.tsx`. Reuse this skeleton pattern for new list screens instead of a bare spinner if the list is a primary screen.

### Pull to refresh
Use React Native's `RefreshControl` on the `FlatList`/`ScrollView`, wired to a `refreshing` state and an `onRefresh` handler that resets to page 1 and refetches — this is the convention on every existing list screen (`LanguagesScreen`, `CountriesScreen`, `ListChurchScreen`, `UserListScreen`, `WorshipServicesScreen`, `VisitsScreen`).

### Pagination UI
- Reuse `app/shared/components/Pagination.tsx` for numbered page controls on server-paginated lists.
- Reuse `app/shared/components/PaginatedListPager.tsx` if horizontal swipe-between-pages UX is needed.
- Don't build a new pagination component or copy-paste inline pagination markup (an existing duplicate in `UserListScreen.tsx` is legacy, not a pattern to repeat).

### Error messages
`Alert.alert(t('error'), message)` for action/mutation failures. Inline error text (e.g. below a form field) only where already established, like `useLoginForm`'s `errorMessage`. There is no toast library — don't add one for a single feature without asking.

### Success messages
`Alert.alert(t('success'), message)` after successful create/update/delete, consistent across modules.

---

## 7. Existing Reusable Components

**API services** (reuse, don't duplicate):
- `app/config/api.ts` — the one Axios client (`api` default export, `DEFAULT_PAGE_LIMIT` constant).
- `app/modules/auth/services/auth.service.ts` — `login`, `logout`, `forgotPassword`.
- One `*.service.ts` per feature module under `app/modules/<feature>/services/` (23 total, e.g. `country.service.ts`, `church.service.ts`, `user.service.ts`, `visit.service.ts`, `faq.service.ts`, `monthlydata.service.ts`, etc.) — check the matching module before writing new request logic.
- `app/shared/config/dashboard.constants.ts` → `getUserProfile()` for current-user data (wraps `users/me`).

**Hooks:**
- `app/modules/auth/hooks/useLoginForm.ts` — login flow + form/error state.
- `app/modules/user/hooks/useChurchLists.ts` — church dropdown data fetching.
- `app/shared/hooks/useTranslation.ts` — i18n strings for error/success messages.

**Utilities:**
- `app/shared/utils/permissions.ts` — RBAC (`ROLES`, `isSuperAdmin`, `isOverseer`, `isPastorLeader`, `resolveRoleIdFromUser`).
- `app/shared/utils/downloadImage.ts` — authenticated image download.
- `app/shared/utils/networkEvents.ts` — reconnect event emitter.

**Common components:**
- `app/shared/components/Pagination.tsx`, `PaginatedListPager.tsx` — pagination UI.
- `app/shared/components/SearchInput.tsx` — search box for list screens.
- `app/shared/components/NetworkReloadListener.tsx`, `NetworkStatusBanner.tsx` — connectivity handling.

**Shared models:** none centralized — types are co-located per service file. `app/shared/interfaces/MenuItem.ts` is the only shared non-API interface.

**Constants:**
- `DEFAULT_PAGE_LIMIT`, `TOKEN_FOR_TEST` — `app/config/api.ts`.
- `ROLES` — `app/shared/utils/permissions.ts`.
- AsyncStorage keys in use: `token`, `appLanguage`, `selectedChurchId`, `selectedChurchName`, `selectedChurchCountryName` — reuse these exact string literals, do not rename.

---

## 8. Code Style

- **Naming:** `camelCase` functions/variables, `PascalCase` types/interfaces/components, verb-first service function names (`listX`, `getX`, `createX`, `updateX`, `deleteX`, `uploadX`).
- **Async/await:** always `async/await` with `try/catch/finally`, never raw `.then()` chains, for both services and screen-level fetch handlers.
- **TypeScript:** define request/response interfaces per service file; type Axios calls with generics where practical (`api.get<ListCountriesResponse>(...)`).
- **Strict typing / avoid `any`:** prefer explicit types. `any` does appear in older code (loose payload params, `(config.headers as any)`) — treat that as legacy debt, not a pattern to copy in new code. Type new payloads and responses explicitly.
- **Reuse existing utilities:** always check for an existing service function, hook, or shared component (§7) before writing new request/UI logic. Prefer extending an existing `*.service.ts` file over creating a parallel one for the same domain.
- **Do not duplicate logic:** don't re-implement pagination, RBAC checks, token/language header injection (already automatic via the interceptor), or error-message extraction — reuse `getApiErrorMessage`-style helpers, `Pagination`/`PaginatedListPager`, and `permissions.ts` helpers.

---

## 9. Checklist — Before Implementing a New API

1. Does a service file already exist for this domain under `app/modules/<feature>/services/`? Extend it; only create a new one for a genuinely new domain.
2. Does a similar request pattern already exist (list+pagination, CRUD, bulk, upload)? Copy the closest existing example (§2) instead of designing a new shape.
3. Define `*Payload`/`*Params` (request) and `*Response`/`*Item` (response) interfaces in the service file — no `any`.
4. Do **not** manually set `Authorization`/`Accept-Language` headers — the interceptor in `app/config/api.ts` already injects them.
5. Use `DEFAULT_PAGE_LIMIT` for any paginated list; follow the standard `{ items, total, page, limit, total_pages, has_next, has_previous }` response shape.
6. Wrap the call in `try/catch`, log with `console.error`, and throw an `Error` with a useful `message` (reuse `getApiErrorMessage` pattern for rich backend errors).
7. In the screen/hook: manage `loading`/`refreshing`/`error`/empty state with local `useState` — no new global store or data-fetching library.
8. Wire up `RefreshControl` for pull-to-refresh and `Pagination`/`PaginatedListPager` for paged UI if this is a list screen.
9. Use `Alert.alert(t('success'|'error'), message)` for mutation feedback; use `t('noDataFound')` for empty state.
10. If offline/reconnect behavior matters, use the existing `networkEventEmitter` + `route.params?.reload` pattern rather than new logic.
11. Double-check you haven't introduced a repository layer, DTO mapper, global cache, or retry/refresh logic — none of these exist today; adding one is an architecture change and should be flagged, not done silently.
