# Self-hosting reference

The [CLI](./cli.md) is the easiest way to run an instance. This page describes what it sets up,
for running the stack by hand or for checking what the CLI did.

## Stack

`docker-compose.yml` runs four services:

| Service | Image | Role |
| --- | --- | --- |
| `web` | `werewolf-web` | Next.js app; the only service that is exposed. It forwards `/api` to the API internally. |
| `api` | `werewolf-api` | NestJS API. Applies the database migrations when it starts. |
| `db` | `postgres:16-alpine` | PostgreSQL; data in a Docker volume |
| `backup` | `postgres:16-alpine` | Writes a gzipped `pg_dump` to `instance/backups/` every night and deletes backups older than `BACKUP_RETENTION_DAYS` |

How the app is reached is decided by one overlay from `compose/`, combined with the core file
through `COMPOSE_FILE`:

| Overlay | Use it for | Also set |
| --- | --- | --- |
| `compose/caddy.yml` | Your own domain. A bundled Caddy gets TLS certificates automatically; ports 80/443 must be free and the domain must point at the server. | `DOMAIN`, `SECURE_COOKIES=true` |
| `compose/port.yml` | LAN or laptop over plain HTTP, or a reverse proxy on the same host (`WEB_BIND=127.0.0.1`). | `WEB_BIND`, `WEB_PORT`, `SECURE_COOKIES` (`false` for plain HTTP) |
| `compose/proxy-network.yml` | An existing reverse proxy in Docker; it forwards to `werewolf-web:3000`. | `PROXY_NETWORK`, `SECURE_COOKIES=true` |

A reverse proxy in front of the app should pass `Host`, `X-Forwarded-For` and
`X-Forwarded-Proto`. The API trusts forwarded headers only from loopback and private
addresses; it needs the client address for the login throttle.

## Manual setup

```bash
mkdir -p instance/backups instance/branding && cp .env.example instance/.env && ln -s instance/.env .env
# edit instance/.env (see below), then:
docker compose up -d
```

`instance/.env` is linked to `./.env`, so plain `docker compose` finds it. At least set
`COMPOSE_FILE` with the overlay you need, a strong `POSTGRES_PASSWORD`, a long random
`SESSION_SECRET` (e.g. `openssl rand -base64 48`) and the group password as
`GATE_PASSWORD_HASH`:

```bash
docker run --rm node:22-alpine sh -c 'cd /tmp && npm i -s bcryptjs && node -e "console.log(require(\"bcryptjs\").hashSync(process.argv[1], 12))" "your password"'
```

Put the hash in single quotes in `instance/.env`, because it contains `$` characters.

## Configuration

| Variable | Meaning |
| --- | --- |
| `COMPOSE_FILE` | Core file plus one overlay, e.g. `docker-compose.yml:compose/port.yml` |
| `DOMAIN` | Public domain (`compose/caddy.yml`) |
| `WEB_BIND` / `WEB_PORT` | Interface and port (`compose/port.yml`), default `0.0.0.0:8080` |
| `PROXY_NETWORK` | External Docker network of your proxy (`compose/proxy-network.yml`) |
| `SECURE_COOKIES` | `Secure` session cookie, default `true`; `false` only for plain HTTP |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Database credentials |
| `GATE_PASSWORD_HASH` | bcrypt hash of the group password (preferred) |
| `GATE_PASSWORD` | Plain-text group password (development only) |
| `SESSION_SECRET` | Secret for signing session tokens (required, long and random); a new one logs everybody out |
| `SESSION_TTL` | Session lifetime, default `30d` |
| `DEFAULT_LOCALE` | Language for visitors who have not picked one, `en` (default) or `de` |
| `TIME_ZONE` | IANA time zone of the group, default `UTC` |
| `IMPRINT_URL` | Optional imprint/legal notice link in the footer |
| `GROUP_NAME` | Optional group name shown instead of "Werewolves" (nav, login, home page, tab title, app icon name); the same in every language |
| `GROUP_TAGLINE` | Optional subtitle on the home page |
| `ACCENT_COLOR` | Accent colour: `violet` (default), `blood`, `moon`, `forest`, `amber` or `silver` |
| `BACKUP_RETENTION_DAYS` | Days to keep backups, default `14` |
| `IMAGE_PREFIX` / `IMAGE_TAG` | Which container images to run, default `ghcr.io/timgoldbach/werewolf` and `latest` |

For an own logo, put `logo.svg` or `logo.png` (square, at least 512 px) into
`instance/branding/`. It replaces the pixel wolf and becomes the favicon and app icon; without
one the app keeps its default look.

Wrong passwords are throttled: after 10 failed logins from one client within 15 minutes,
further attempts are refused until the window ends. In LAN mode all devices count as one
client.

## Instance data

Everything that belongs to one installation lives in `instance/` (ignored by git):

| Path | Content |
| --- | --- |
| `instance/.env` | Configuration and secrets |
| `instance/branding/` | The logo |
| `instance/backups/` | Database backups |
| `instance/caddy/` | Caddy's certificates and state (domain mode) |

The database itself is in the Docker volume `werewolf_pgdata`. To move an instance to another
server, take a fresh backup with `./werewolf backup`, clone the repository there at the same
version, copy `instance/` over, then run `./werewolf start` and `./werewolf restore`.

## Images

Every release publishes multi-arch images (amd64, arm64) to GHCR as
`ghcr.io/timgoldbach/werewolf-api` and `-web`, tagged `vX.Y.Z`, `vX.Y`, `vX` and `latest`.
`docker compose build` builds them from the checkout instead; forks that publish their own
images set `IMAGE_PREFIX`.
