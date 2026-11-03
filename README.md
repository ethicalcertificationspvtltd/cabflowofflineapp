# Cab Flo Auditor (React Native CLI)

Offline-first field auditor app for Cab Flo. Login → assigned audits → checklists / notes / photos → save locally → sync when online.

**Stack:** React Native CLI + TypeScript, React Navigation, Zustand (UI) + TanStack Query, WatermelonDB schema (+ MemoryDatabase runtime/tests), react-native-keychain, react-native-mmkv, NetInfo, React Hook Form + Zod, image-picker + media outbox, JWT/refresh-compatible API client with mock backend.

## Architecture

```
src/
  app/           # bootstrap, navigation, DI services
  features/      # auth, audits, drafts, syncCenter, profile (UI)
  entities/      # domain types (audit, media, user)
  shared/        # config, storage, ui, hooks, monitoring
  sync/          # SyncEngine, OutboxQueue, conflicts, media queue
  data/          # api (mock + HTTP), db schema/models, repositories, adapters
```

UI talks to domain repositories / sync engine; repositories own local source of truth after first pull.

## Setup (iOS / Android)

### Prerequisites

- Node ≥ 18, JDK 17, Android Studio / Xcode per [RN environment setup](https://reactnative.dev/docs/environment-setup)
- CocoaPods for iOS

### Install

```bash
npm install
# iOS
bundle install && npm run pod-install
```

### Env

Copy `env/.env.example` → project root `.env` (or use `env/.env.development`).  
Set `CABFLO_USE_MOCK_API=false` and `CABFLO_API_BASE_URL` for staging/prod. **No secrets in git.**

```bash
npm start
npm run android   # or npm run ios
```

Demo login (mock API): `auditor@cabflo.demo` / `auditor123`

### Scripts

| Script | Purpose |
|--------|---------|
| `npm test` | Jest (sync / outbox / conflicts) |
| `npm run test:sync` | Sync-focused suite |
| `npm run typecheck` | `tsc --noEmit` |

## Offline demo steps

1. Sign in (mock seeds 3 assigned audits and pulls them into local DB).
2. Open **Profile** → turn **Simulate online** off (airplane-mode stand-in).
3. Open an audit → toggle checklist, edit notes, **Add photo (local-first)**.
4. Confirm **Drafts** and **Sync Center** show pending counts; banner says Offline.
5. Turn **Simulate online** back on (or pull-to-refresh on Home when NetInfo is online).
6. Sync Center: pending → synced; photos upload via separate media queue.
7. Kill mid-sync: jobs left in `syncing` are recovered to `pending` on next run (`recoverInterrupted`).
8. Conflicts: admin-locked assignment + divergent draft notes → Sync Center / audit detail conflict UI.

## Sync engine

```mermaid
sequenceDiagram
  participant UI
  participant Local as Local DB (source of truth)
  participant Outbox
  participant MediaQ as Media queue
  participant API as Cab Flo API / Mock

  UI->>Local: Edit audit / add photo
  UI->>Outbox: Enqueue (client UUID, version)
  Note over UI,Local: Works fully offline

  UI->>API: Reconnect / Sync now
  API-->>UI: Refresh JWT if needed
  API-->>Local: Pull assigned + reference
  Local->>Local: Merge (LWW drafts / server-wins locks)
  Outbox->>API: Push batch (partial; backoff+jitter)
  API-->>Outbox: ok / conflict / fail per item
  MediaQ->>API: Upload chunks (resume offset)
  API-->>Local: remoteUrl; keep localUri preview until then
```

**Rules**

- Local DB is source of truth after first sync (airplane mode OK until refresh expiry).
- Outbox uses client UUIDs (idempotent). Exponential backoff + jitter. Per-record + global status: `pending | syncing | synced | failed | conflict`.
- One failure does not block the rest of the batch.
- Conflicts: LWW for drafts; server-wins for admin-locked assignment/status; unresolvable surfaced in UI.
- Media: save locally first, compress stub, separate upload queue, resume via byte offset.
- Logout wipes keychain tokens, MMKV prefs, and in-memory local DB.
- Retention purge: `auditRetentionDays` (config / Profile cycle).

## WatermelonDB

Schema + migrations + `AuditModel` live under `src/data/db/`. Runtime repositories use `MemoryDatabase` so Jest and the mock demo share one surface. Call `createWatermelonDatabase()` (SQLite on device / LokiJS in tests) when cutting repositories over to native WatermelonDB.

## Stubs / TODOs

- Media upload resume polish (RNFS + real multipart endpoints)
- Sentry SDK wiring (`src/shared/monitoring/sentry.ts`)
- E2E (Detox/Maestro)
- Full WatermelonDB repository adapter cutover

## Limitations

- Mock API is in-process (not a real network server).
- Image picker falls back to a stub `file://` URI when the native module is absent.
- HTTP adapter paths are conventional Cab Flo JWT endpoints — confirm against your OpenAPI before disabling mock mode.
- No Expo; bare RN CLI only.
