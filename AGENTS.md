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
