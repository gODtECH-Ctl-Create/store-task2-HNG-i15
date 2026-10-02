# AGENTS.md

## Project
Store Task 2 for HNG, a shop website with:
- Product browsing and cart flow
- Checkout
- Neon database persistence
- Mailgun confirmation emails
- Google authentication

## Development rules
- Use the existing project structure and framework conventions before introducing new abstractions.
- Keep database access server-side and never expose secrets to the client.
- Store all persistent shop, cart/order, checkout, and user data in Neon.
- Validate checkout input on the server before creating orders.
- Treat payment status and order totals as server-trusted values only.
- Use Mailgun only from server-side code; keep the Mailgun API key private.
- Use Google OAuth/OpenID Connect through Google Cloud Console configuration. Never commit client secrets.
- Put secrets in environment variables and document required variable names in `.env.example`.
- Prefer small, composable TypeScript modules and clear error handling.
- Run lint, type checks, and the project's available tests before considering a change complete.

## Neon
The linked Neon project is:
- Project ID: `shiny-water-16751446`
- Branch: `production`

Keep Neon CLI/config files aligned with the repository setup. Do not hard-code database credentials.

## Git workflow
- Use focused commits.
- Do not rewrite or delete unrelated existing work.
- Keep configuration changes separate from feature changes when practical.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
