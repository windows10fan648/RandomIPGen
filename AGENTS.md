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

## Infrastructure & Security
- **Vercel WAF**: A global edge rule exists in the Vercel Dashboard (not in the repo) that rate-limits requests to `/api/generate` AND `/mcp` to 100 req/min per IP, denying with a 403.
- **Do not attempt to recreate this WAF rule in Express.** The Express in-memory limiter is a secondary fallback. The Vercel WAF is the primary defense.

## Agent rules (important)

- **Do not remove or disable existing features.** Agents may only fix bugs or improve the app.
- Preserve all routes, endpoints, MCP tools, and UI features listed below.
- **Always run `node --test` after making changes.** If any test fails, fix the issue immediately before finishing.

## Current features (do not remove)

- IPv4/IPv6 generation with 1-100 quantity and range selector.
- Device-specific views: /mobile and /tablet with touch-optimized UI.
- Dark/light theme toggle with persisted preference and Lucide-style icons.
- Results list with per-item copy, Copy All, Download TXT, Export JSON.
- Append random ports toggle (IPv4 colon, IPv6 brackets).
- Rate limiting 100 req/min per IP, trust proxy, plus Vercel WAF.
- Security headers, SEO metadata, robots.txt, sitemap.xml.
- Privacy and Terms pages, About with bug report link and side-project note.
- Legal disclaimer in footer.
- MCP Streamable HTTP server (`/mcp`, `mcp-server.js`) with titles/annotations and CORS.
- MCP tools: generate_ips, validate_ip, list_ranges, ip_info, generate_with_ports, generate_in_cidr, bulk_validate.
- Settings persisted in localStorage; aria-live results.
- Tests via `node --test` (generator + API/MCP integration).

## Recent changes (do not remove)

- Added IP range selector (IPv4 + IPv6 presets) with backend validation/filtering.
- Added Export as JSON and append-random-ports toggle (IPv6 bracket formatting).
- Rate limit set to 100 requests/minute per IP with `trust proxy`.
- Added MCP server using Streamable HTTP (`mcp.js`, `/mcp` endpoint, `mcp-server.js`).
- Added MCP tools: list_ranges, ip_info, generate_with_ports, generate_in_cidr, bulk_validate.
- Added dark/light theme toggle with Lucide icons and persisted preference.
- Added security headers, SEO metadata, robots.txt, sitemap.xml.
- Added integration tests and localStorage persistence.
- vercel.json routes `/api/*` to Express and bundles `views/`.
