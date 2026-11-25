# Project: RandomIPGen

## Stack

- Frontend: EJS templates + vanilla HTML/CSS/JavaScript
- Backend: Node.js + Express 5
- IP generation: random-ip-gen
- Rate limiting: built-in in-memory limiter (30...100 req/min per IP, no extra dependency)
- Config: dotenv

## Commands

- Start dev server: `pnpm dev`
- Start backend (production): `pnpm start`
- Run tests: `node --test`

## Constraints & Rules

- **NO NEW DEPENDENCIES**: Use only packages already in `package.json`. Do not install React, Vite, Tailwind, or other frameworks.
- **NO DATABASES**: Stateless utility.
- **NO AUTHENTICATION**: No logins, JWT, or sessions.
- **NO CREDIT SYSTEMS**: Rely solely on the Express rate limiter.
- **FORMATTING**: IPv4 ports use a single colon (`192.168.1.1:8080`). IPv6 ports must use brackets (`[2001:db8::1]:8080`) once enabled.
- **IPV6 PORTS**: IPv6 ports use bracket formatting (`[addr]:port`). Checkbox enabled for both versions.
- **VALIDATION**: Quantity input must enforce a 1-100 limit on both frontend and backend.

## Known Issues / TODOs

- [x] Implement IPv6 bracketed port formatting and re-enable the checkbox for IPv6.
- [x] Add "Copied!" feedback state to individual "Copy" and "Copy All" buttons.
- [x] Change the "Back to generator" link color on the About page to match the primary blue theme.

## Recent changes (do not remove)

- Added IP range selector (IPv4 + IPv6 presets) with backend validation/filtering.
- Added Export as JSON and append-random-ports toggle (IPv6 bracket formatting).
- Rate limit set to 100 requests/minute per IP with `trust proxy`.
- Added MCP server using Streamable HTTP (`mcp.js`, `/mcp` endpoint, `mcp-server.js`).
- vercel.json routes `/api/*` to Express and bundles `views/`.
