# RandomIPGen

A modern, professional developer tool for generating random IPv4 and IPv6 addresses. Built with Node.js, Express, and EJS.

## Technology stack

- Node.js
- Express 5
- EJS
- Vanilla HTML, CSS, JavaScript
- random-ip-gen
- dotenv
- nodemon (development)

## Installation

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

## Production startup

```bash
pnpm start
```

The server listens on `process.env.PORT || 3000`.

## API documentation

### POST /api/generate

Request body:

```json
{
  "version": "ipv4",
  "count": 10
}
```

- `version`: `"ipv4"` or `"ipv6"`.
- `count`: integer between 1 and 100.

Successful response:

```json
{
  "success": true,
  "version": "ipv4",
  "count": 10,
  "addresses": ["192.168.10.45", "172.20.14.8"]
}
```

Error responses use appropriate HTTP status codes (400, 405, 404, 500) with a JSON body `{ "success": false, "error": "..." }`. Responses include `Cache-Control: no-store`.

### Example API requests

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"version":"ipv4","count":5}'
```

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"version":"ipv6","count":3}'
```

## Vercel deployment

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Vercel detects the Express application via `server.js`.
4. Deploy the website.
5. Access the deployed application and API at the provided URL.

No additional environment variables are required for normal operation.

## MCP server

Run a Streamable HTTP MCP server:

```bash
node mcp-server.js
```

It listens on `http://localhost:3001/mcp` by default and exposes `generate_ips` and `validate_ip` tools. The same endpoint is also mounted in the Express app at `/mcp`.

## Recent changes

- Added IPv4/IPv6 IP range selector with backend filtering.
- Added Export as JSON and append-random-ports toggle (IPv6 uses bracket formatting).
- Added rate limiting (100 requests/minute per IP) and `trust proxy`.
- Added "Copied!" feedback and About link theming.
- Added MCP server (Streamable HTTP) for LLM tool access.

## Tests

```bash
node --test
```

## Notes

Generated addresses are random examples suitable for testing and demonstration. They do not belong to real devices and are not guaranteed to be publicly routable or online.