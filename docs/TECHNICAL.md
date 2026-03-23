# RaumVote — Technical Documentation

## 1. Overview

RaumVote is a mobile-first voting application where users navigate AI-generated binary decision trees by swiping left or right. Each choice splits into two new options until the user reaches a leaf node they can vote for. The app is built with **Next.js 16** (App Router), **React 19**, **Prisma 7** on **PostgreSQL (Neon)**, and uses **GPT-4o** for tree generation and **Gemini/HuggingFace** for image generation.

The UI language is German. All user-facing text uses German labels (e.g. "Profil", "Ergebnisse", "Abstimmung läuft").

---

## 2. Architecture

### 2.1 Sessions & Decision Trees

The central data model is the **VotingSession**. Each session owns a complete binary decision tree. Sessions follow a lifecycle: `draft → active → archived`. Only one draft or active session may exist at a time. Archived sessions are read-only.

Tree nodes (`TreeNode`) are stored as a self-referential table. Each node has a `parentId`, a `side` ("left" or "right"), and a `depth`. A unique constraint on `(parentId, side)` guarantees the binary structure. The root node has `side = null` and `depth = 0`.

When a user navigates to a node whose children have not yet been generated, the system calls GPT-4o with the full path from root to the current node (the "episode") as context. The AI returns a question and two child options with German titles (`titel`), descriptions (`beschreibung`), and free-form context. This on-demand generation means the tree grows organically as users explore it.

### 2.2 Database Schema

The PostgreSQL schema (managed by Prisma) consists of 10 models:

| Model | Purpose |
|-------|---------|
| **VotingSession** | Root aggregate. Owns tree config (system prompt, model, image settings), timing (duration, start/end), and status. Cascade-deletes all child records. |
| **TreeNode** | Binary tree node. Stores `titel`, `beschreibung`, `context`, `question`, `mediaUrl`, discovery tracking (`discovererHash`, `discoveredAt`), and visit counter. |
| **Vote** | One vote per voter per session. Unique on `(sessionId, voterHash)`. Stores the chosen `optionId` (a leaf node ID). |
| **Like** | One like per voter per option per session. Unique on `(sessionId, optionId, voterHash)`. |
| **Comment** | Threaded comments on options. Self-referential `parentId` for replies. Indexed on `(sessionId, optionId, createdAt)`. |
| **CommentLike** | One like per voter per comment. Unique on `(commentId, voterHash)`. |
| **User** | Profile data. Keyed by `voterHash`. Stores optional `username` and `avatarUrl` (base64 data URL, resized to 160×160). |
| **AccessToken** | Pre-created UUID tokens distributed via QR codes. Has an `active` flag for revocation. |
| **ImageTask** | Tracks image generation jobs per node. Status lifecycle: `pending → generating → completed/failed`. |
| **JobQueue** | General-purpose job queue for background work (pre-generation, image processing). Uses `SELECT ... FOR UPDATE SKIP LOCKED` for safe concurrency. |

### 2.3 Project Structure

```
app/                    Next.js App Router pages and API routes
├── api/                33 API endpoints (admin, auth, tree, vote, like, comment, results, etc.)
├── n/[nodeId]/         Split-screen binary choice UI (main voting page)
├── o/[optionId]/       Single option detail view
├── login/[token]/      QR code login flow
├── start/              Welcome screen with PWA install prompts
├── results/            Leaderboard
├── dream/              User's current voted option
├── me/                 Profile editing
├── admin/              Admin dashboard (sessions, tokens, nodes, images, infrastructure)
└── denied/             Access denied page
components/             Shared UI components (ActionRail, CommentBottomSheet, GlobalTabbar, etc.)
lib/                    21 utility modules (auth, tree, voting, image generation, queue, etc.)
prisma/                 Schema and migrations
middleware.ts           JWT verification and request logging
worker.ts               Standalone background job processor
```

---

## 3. Authentication & Privacy

### 3.1 Token-Based Access

Access is controlled through pre-created tokens. An admin generates UUID tokens via the `/admin` interface, which are stored in the `AccessToken` table. These tokens are distributed as QR codes encoding the URL `/login/{token}`.

When a user scans a QR code:

1. The browser navigates to `/login/{token}`.
2. The client calls `POST /api/auth/login` with the token.
3. The server validates the token against the `AccessToken` table (must exist and be `active`).
4. If valid, the server signs a JWT containing the voter hash and sets it as an `httpOnly` cookie (`rv-jwt`, 30-day expiry).
5. The raw `voterId` is also saved to `localStorage` as a fallback for offline scenarios.
6. The user is redirected to `/start`.

### 3.2 Voter Privacy

Raw voter tokens are never stored in vote, like, or comment records. All database records use a **voterHash** — a SHA-256 hash of `{VOTER_PEPPER}:{voterId}`. The `VOTER_PEPPER` environment variable is required and the application crashes on startup if it is missing.

On each API request, voter identity is resolved in this order:

1. Check the `x-voter-hash` header (set by middleware from the JWT cookie) — fastest path.
2. Fall back to extracting `voterId` from the request body or query parameters, validate it against `AccessToken`, then hash it.

The `useAuth()` React hook manages client-side authentication state. It checks `localStorage` for a stored `voterId`, validates it via `/api/auth/me`, and redirects to `/denied` if the token is invalid or missing.

---

## 4. Core Features

### 4.1 Voting Mechanism

Voting uses a toggle/upsert pattern. Each voter may have at most one active vote per session (enforced by a unique constraint on `sessionId + voterHash`).

When `POST /api/vote` is called with `{ sessionId, optionId, voterId }`:

- If the voter has an existing vote on the **same** option → the vote is **deleted** (toggle off).
- If the voter has a vote on a **different** option or no vote → the vote is **upserted** to the new option.

The same toggle pattern applies to likes (`POST /api/like`) and comment likes (`POST /api/comment/like`). The session must be active and within its deadline (`startedAt + durationDays`) for voting to be accepted.

### 4.2 Tree Generation

Tree nodes are generated on-demand via GPT-4o. When a user navigates to a node whose children don't yet exist, the system:

1. Walks from the current node back to the root, collecting the full path (the "episode").
2. Sends the episode to GPT-4o with the session's `systemPrompt` and structured JSON schema output.
3. GPT-4o returns a question and two child nodes (left/right), each with `titel`, `beschreibung`, and `context`.
4. The new nodes are persisted to the database.
5. Image generation tasks are enqueued for the new nodes.

**Pre-generation:** To reduce latency, the client fires a `prefetchGenerate()` call when a user lands on a node page. This pre-generates grandchildren so that the next navigation is instant. The `JobQueue` supports background pre-generation jobs that recursively generate descendants up to a configurable depth.

### 4.3 Image Generation

Each tree node has a `mediaUrl` that starts as a placeholder. Image generation is asynchronous:

1. When new nodes are created, `ImageTask` records are created with status `pending`.
2. A worker (standalone `worker.ts` or inline fire-and-forget) claims tasks using optimistic locking: `UPDATE ... WHERE status = 'pending'` with `SKIP LOCKED`.
3. The worker calls the configured image model (Gemini `gemini-2.0-flash-preview-image-generation` or HuggingFace models prefixed with `hf:`).
4. Generated images are uploaded to **Cloudflare R2** and the node's `mediaUrl` is updated.
5. The client polls `GET /api/tree/node/images` every 3 seconds until both left and right child images are no longer placeholders.

Tasks stuck in "generating" for more than 5 minutes are automatically marked as failed. The admin dashboard provides controls to retry failed tasks, backfill missing images, and clear completed tasks.

### 4.4 Discovery System

The first user to visit a previously-unseen node is recorded as its **discoverer** (`discovererHash`, `discoveredAt`). The UI shows a celebration modal (via `DiscoveryRevealCard`) when `isDiscoverer` is `true` in the generation response. Each node also tracks `amountVisits` as a popularity counter. Discovery can be toggled per session via the `discoveryEnabled` flag.

---

## 5. API Design

All API routes follow a consistent pattern:

1. Extract and validate parameters (query params for GET, JSON body for POST).
2. Resolve voter identity via `getVoterHash()` (JWT header or legacy token).
3. Perform the database operation via Prisma.
4. Return a JSON response.

Admin endpoints (`/api/admin/*`) require a `Bearer {ADMIN_SECRET}` authorization header. Session state transitions are handled via `PATCH /api/admin/session` with action parameters (`start`, `archive`, `set-default`). Field updates are restricted by session status — draft sessions allow all edits, active sessions allow only a subset, and archived sessions are immutable.

Key API endpoints:

| Category | Endpoints | Purpose |
|----------|-----------|---------|
| **Auth** | `/api/auth/login`, `/api/auth/validate`, `/api/auth/me` | Token exchange, JWT issuance, identity verification |
| **Tree** | `/api/tree/node`, `/api/tree/generate`, `/api/tree/node/images` | Node data, on-demand generation, image polling |
| **Voting** | `/api/vote`, `/api/vote/status` | Vote toggle and status check |
| **Social** | `/api/like`, `/api/comment`, `/api/comment/like` | Likes and threaded comments on options |
| **Session** | `/api/session`, `/api/results` | Active session metadata and vote leaderboard |
| **Admin** | `/api/admin/session`, `/api/admin/tokens`, `/api/admin/image-tasks`, `/api/admin/tree-reset` | Full CRUD for sessions, tokens, and image tasks |

---

## 6. Frontend Architecture

### 6.1 Responsive Design

The app uses a JavaScript-based responsive system (`useResponsive` hook) with three breakpoints:

- **Small** (`< 540px`): Portrait phone — default mobile experience.
- **Medium** (`540px–1080px`): Landscape tablet.
- **Large** (`≥ 1080px`): Desktop.

The hook returns scaled values for font sizes, spacing, border radii, action rail dimensions, and tab bar height. Styles are defined as inline `React.CSSProperties` objects (typically `const s: Record<string, React.CSSProperties>` at the bottom of each component file). Tailwind is imported but rarely used directly.

### 6.2 Shared Components

- **`ActionRail`**: A vertical column of 52px circular buttons (TikTok-style) for like, vote, comment, and share actions. Supports badge counts, active states with configurable colors, and uses `e.stopPropagation()` to prevent click bubbling from nested parent elements.

- **`CommentBottomSheet`**: A fixed bottom sheet (60% viewport height, z-index 201) with a drag handle, scrollable comment thread, reply support, and like toggles. Character limit: 500.

- **`GlobalTabbar`**: Fixed footer navigation (64px height, z-index 100) with 4 tabs: home, results, dream, and profile. Hidden on admin, login, and denied routes. All page content must include 64px bottom padding to account for this.

### 6.3 Swipe Navigation

The binary choice page (`/n/[nodeId]`) uses a custom `useSwipeChoice` hook for gesture detection. Users can swipe or drag left/right to select a choice. The page also features idle tilt animation when no user input is detected and supports keyboard navigation.

---

## 7. Background Processing

### 7.1 Standalone Worker

The `worker.ts` file provides a standalone Node.js process for deployment environments like Docker or Railway:

```bash
npx tsx worker.ts
```

It runs a polling loop every 2 seconds that:

1. Claims up to 3 pending `ImageTask` records using `SKIP LOCKED` to prevent race conditions.
2. Processes each task (generate image → upload to R2 → update node).
3. Claims pending `JobQueue` entries for pre-generation work.
4. Recursively generates descendant nodes and enqueues further sub-jobs.

### 7.2 Inline Processing

In environments without a dedicated worker (e.g. Vercel with its 10-second function timeout), image tasks are processed inline via `processImageTasksInBackground()` — a fire-and-forget call that runs after the API response is sent. Optimistic locking ensures no duplicate work if both a worker and inline processing are active.

---

## 8. Deployment & Configuration

### 8.1 Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Neon pooled PostgreSQL connection string |
| `DIRECT_URL` | Yes | Neon direct connection (for migrations) |
| `VOTER_PEPPER` | Yes | Secret pepper for SHA-256 voter ID hashing |
| `ADMIN_SECRET` | Yes | Bearer token for admin API access |
| `JWT_SECRET` | No | JWT signing secret (falls back to `VOTER_PEPPER`) |
| `OPENAI_API_KEY` | No | GPT-4o API key for tree generation |
| `GEMINI_API_KEY` | No | Gemini API key for image generation |
| `R2_ENDPOINT` | No | Cloudflare R2 S3-compatible endpoint |
| `R2_ACCESS_KEY_ID` | No | R2 access credentials |
| `R2_SECRET_ACCESS_KEY` | No | R2 secret credentials |
| `R2_BUCKET_NAME` | No | R2 bucket name |
| `R2_PUBLIC_URL` | No | Public URL prefix for R2 assets |

### 8.2 Build & Run

```bash
npm run build        # prisma generate + next build
npm run dev          # Development server
npm run lint         # ESLint checks
npx tsx worker.ts    # Start background worker (production)
```

The Next.js config uses `output: "standalone"` for Docker-compatible builds. Image remote patterns allow all HTTPS hosts for R2-hosted content.

### 8.3 Database Migrations

```bash
npx prisma migrate dev --name <migration-name>   # Create and apply migration
npx prisma generate                               # Regenerate Prisma client
```

Prisma uses the `PrismaPg` adapter for Neon's pooled connections. The schema evolution is tracked across 11 migration files.
