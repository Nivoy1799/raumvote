# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Next.js)
npm run build        # Generate Prisma client + build Next.js
npm run lint         # ESLint
npx prisma migrate dev --name <name>   # Create + apply migration
npx prisma generate  # Regenerate Prisma client after schema changes
```

No test framework is configured.

## Architecture

**RaumVote** is a mobile-first voting app where users swipe through binary-choice decision trees. Built with Next.js 16 App Router, React 19, Prisma 7 (PostgreSQL on Neon), and FontAwesome icons.

### Core concept: Decision trees

The voting content is a static JSON tree (`public/tree.active.json`) with nodes (binary questions) and options (choices with images). Users navigate by picking left/right, eventually reaching a leaf option they can vote for.

- `lib/tree.types.ts` — `TreeSnapshot`, `Node`, `Option` types
- `lib/tree.client.ts` — Client-side tree fetcher (caches in memory)
- `lib/tree.ts` — Legacy hardcoded tree (kept for reference)

### Voter identity (privacy-first)

Users are anonymous. A UUID `voterId` lives in `localStorage` only. The server never stores it — all DB records use `voterHash` (SHA-256 of `VOTER_PEPPER:voterId` via `lib/voterHash.ts`). Usernames and avatars are optional profile data.

### Page routes

| Route | Purpose |
|---|---|
| `/start` | Redirects to first tree node |
| `/n/[nodeId]` | Split-screen binary choice (main voting UI) |
| `/o/[optionId]` | Single option detail view |
| `/dream` | Shows user's current voted option |
| `/results` | Leaderboard of vote counts |
| `/me` | Profile: username, avatar |

### API routes (`app/api/`)

All API routes follow the same pattern: validate params → hash voterId → Prisma query → JSON response. Toggle endpoints (like, vote, comment-like) check for existing record and delete/create accordingly.

| Endpoint | Methods | Notes |
|---|---|---|
| `/api/vote` | POST | Upsert vote; re-voting same option unvotes |
| `/api/vote/status` | GET | Check user's current vote |
| `/api/like` | POST | Toggle like on option |
| `/api/like/status` | GET | Check if user liked option |
| `/api/like/count` | GET | Like count for option |
| `/api/comment` | GET, POST | List/create comments (with usernames + avatars from User table) |
| `/api/comment/count` | GET | Comment count for option |
| `/api/comment/like` | POST | Toggle like on comment |
| `/api/me` | GET, POST | User profile (username, avatarUrl) |
| `/api/results` | GET | Aggregated vote counts |

### Shared components

- `ActionRail` — Vertical TikTok-style button column (52px circles) with badge counts. Used on both node and option pages for like/vote/comment/share actions.
- `CommentBottomSheet` — Fixed bottom sheet modal (z-index 201) for viewing/posting comments with avatars and like toggles.
- `GlobalTabbar` — Fixed footer navigation (64px height, z-index 100). All page content must account for this via padding.

### Styling approach

Inline `React.CSSProperties` objects (no CSS modules/styled-components). Styles are typically defined as `const s: Record<string, React.CSSProperties>` at the bottom of each file. Tailwind is imported but rarely used directly.

## Environment variables

- `DATABASE_URL` — Neon pooled connection string
- `DIRECT_URL` — Neon direct connection (for migrations)
- `VOTER_PEPPER` — Secret pepper for voter ID hashing (required, crashes on startup if missing)

## Key conventions

- German UI text on user-facing pages (e.g., "Profil", "Speichern", "Deine lokale ID")
- All DB identity uses `voterHash`, never raw `voterId`
- Avatars stored as base64 data URLs in DB (resized to 160x160 client-side, max ~100KB)
- The tab bar is 64px tall — bottom sheets and overlays must account for this
- `e.stopPropagation()` is critical on ActionRail buttons since they're nested inside clickable parent elements
