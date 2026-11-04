<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Dev server: `npm run dev` at http://localhost:3000. Open `localhost`, not `127.0.0.1`. Next.js 16 blocks `/_next` dev assets when the browser origin is `127.0.0.1`, and the archive then stays on "Loading records…".
- Leave `DATABASE_URL` unset. The app creates a PGlite sandbox at `data/sandbox`, applies `supabase/migrations`, and loads the illustrative corpus. No API key is required.
- Checks match CI: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
