# Golf Tripper

Golf trip manager: trips and rosters, rounds, tee sheets, multi-format scoring (Stableford, 4BBB, Ambrose, match play, pennant), leaderboards, side matches, chat, itinerary, documents and trip finances.

## Stack
React 19 + Vite + Tailwind 4 (client), Express + tRPC 11 (server), Drizzle ORM on MySQL, Manus OAuth with a JWT session cookie.

## Develop
```
pnpm install
pnpm dev        # tsx watch + Vite
pnpm check      # typecheck
pnpm test       # vitest
pnpm build
```

## Configuration
Required in production: `JWT_SECRET`, `DATABASE_URL` (the server refuses to start without them).
Also used: `BACKUP_ENCRYPTION_KEY` (dedicated key for private backups; falls back to `JWT_SECRET`), `OAUTH_SERVER_URL`, `VITE_APP_ID`, `OWNER_OPEN_ID`, `BUILT_IN_FORGE_API_URL`/`BUILT_IN_FORGE_API_KEY` (storage), `VAPID_*` (web push), `RESEND_API_KEY`.

## Database
`pnpm db:generate` creates a migration from `drizzle/schema.ts`; review it, then `pnpm db:migrate`. `db:push` runs both.

## Authorisation model
- Reads and writes are scoped to trip members (`server/tripAccess.ts`); pennant setup requires a trip admin.
- PDF reports and `/manus-storage/*` objects for documents, receipts, invoices and chat require trip membership (finance files: financial manager). `private-backups/` is never served.

## Backups
`tools/run-private-project-backup.ts` writes an encrypted database snapshot plus object archives (in ~64 MB parts) to storage. Restore with
`tsx tools/decrypt-private-backup.ts <file.json.enc> [outDir]` using the same `BACKUP_ENCRYPTION_KEY`. Test a restore periodically.
