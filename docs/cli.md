# The `werewolf` CLI

The CLI sets up and runs a werewolf instance on your server. It ships with the repository, so
there is nothing to install besides its requirements:

- Docker with Compose v2
- git (for `update`)
- Node.js 22.18 or newer (the CLI is TypeScript that Node runs directly)

```bash
git clone https://github.com/TimGoldbach/werewolf.git && cd werewolf
./werewolf setup
```

On its first run, `./werewolf` installs the CLI's few dependencies (not the web and API
toolchain). It does that again only when an update changes them.

- [Basics](#basics)
- [Commands](#commands): [setup](#setup), [config](#config), [password](#password),
  [status](#status), [logs](#logs), [start, stop, restart](#start-stop-restart),
  [update](#update), [backup](#backup), [restore](#restore), [uninstall](#uninstall),
  [link](#link)
- [Images and versions](#images-and-versions)
- [Troubleshooting](#troubleshooting)

## Basics

**Language.** The CLI speaks English and German. It follows `--lang de|en`, then the language
of the instance, then your system locale (`LANG`, `LC_ALL`, …). In `setup` and `config`,
`--lang` also sets the default language of the app.

**Questions or flags.** Every command asks for what it needs. To script it, pass the answers as
flags and add `--yes` (`-y`): the command then asks nothing, takes defaults for everything you
left out, and fails instead of prompting. Without a terminal (CI, pipes) it behaves as if you
had passed `--yes`.

```bash
./werewolf setup --mode lan --name "Kiez" --password "vollmond-heult-37" --yes
./werewolf config --accent blood --yes
```

**Help.** `./werewolf --help` lists the commands, `./werewolf <command> --help` all options of
one command. `./werewolf --version` prints the version.

**Where things live.** Everything that belongs to your installation is in `instance/` (ignored
by git): `.env` with the configuration and secrets, `branding/` with the logo, `backups/`, and
Caddy's certificates. The CLI is the intended way to change `instance/.env`; if you edit it by
hand, run `./werewolf restart` afterwards. The database lives in a Docker volume.

**Exit codes.** `0` on success, `1` on errors, `130` when you cancel a prompt with Ctrl+C.

## Commands

| Command | Effect |
| --- | --- |
| [`setup`](#setup) | Set up a new instance |
| [`config`](#config) | Change settings and restart what is affected |
| [`password`](#password) | Set a new group password and end all sessions |
| [`status`](#status) | Version, container health, URL and latest backup |
| [`logs`](#logs) | Show the logs of web and api |
| [`start`, `stop`, `restart`](#start-stop-restart) | Start, stop or recreate the containers |
| [`update`](#update) | Update to the newest release, with backup and rollback |
| [`backup`](#backup) | Back up the database now |
| [`restore`](#restore) | Restore the database from a backup |
| [`uninstall`](#uninstall) | Back up, then remove containers and the database volume |
| [`link`](#link) | Put the `werewolf` command on your PATH |

### setup

Sets up a new instance. `setup` first checks the system: Docker and Compose v2, git, the CPU
architecture (release images exist for amd64 and arm64) and free disk space. Missing Docker or
Compose, or too little disk space, stops the setup; the other checks only warn.

Then it asks:

1. **Language**: the CLI's language and the app's default language. Every visitor can switch
   the language in the app.
2. **Group name** and **tagline**: shown in the app instead of "Werewolves" and below it on
   the home page. Both are optional.
3. **Accent colour**: one of six presets, previewed in the terminal.
4. **Logo**: optional, an SVG or a square PNG of at least 512 px. It replaces the pixel wolf
   and becomes the favicon and app icon.
5. **How the app is reached**: see [modes](#modes) below.
6. **Time zone**: defaults to the one of this system.
7. **Group password**: your own, or a generated one like `vollmond-heult-37`. The instance
   stores only its bcrypt hash.
8. **Imprint link**: optional, shown in the footer.

After a summary and your confirmation it writes `instance/.env`, gets the images (see
[Images and versions](#images-and-versions)), starts everything and checks that the app
answers. At the end it shows the URL, the password and, in LAN mode, a QR code for phones.

If an instance already exists, `setup` offers to open [`config`](#config) instead.

#### Modes

| Mode | Use it for | What the CLI does |
| --- | --- | --- |
| `domain` | Your own domain on a server with public ports 80 and 443 | Runs a bundled Caddy that gets TLS certificates automatically. Checks that the domain resolves to this server and that ports 80 and 443 are free. |
| `proxy` | A reverse proxy that already runs on the server (nginx, Traefik, Caddy, …) | Either publishes the app on `127.0.0.1:<port>` (`--proxy-via port`) or joins the proxy's Docker network as `werewolf-web:3000` (`--proxy-via network`). Prints example configurations for Caddy, nginx and Traefik. |
| `lan` | The local network over plain HTTP, e.g. on a Raspberry Pi | Publishes the app on port 8080 (or `--port`) of all interfaces, without a `Secure` cookie, and shows a QR code. |

When the domain check finds a problem, or the chosen port is taken, the CLI asks whether to
continue or for another port. With `--yes` it stops instead, unless you pass `--force`.

#### Options

| Option | Meaning |
| --- | --- |
| `--lang <de\|en>` | Language of the CLI and default language of the app |
| `--name <text>` | Group name |
| `--tagline <text>` | Tagline below the group name |
| `--accent <colour>` | `violet` (default), `blood`, `moon`, `forest`, `amber` or `silver` |
| `--logo <file\|none>` | Logo file; `none` removes it |
| `--mode <domain\|proxy\|lan>` | How the app is reached |
| `--domain <domain>` | Public domain (required for `domain`, optional for `proxy`) |
| `--proxy-via <port\|network>` | Proxy mode: via a local port or a Docker network |
| `--port <port>` | Port on this host (`lan`, and `proxy` via port; default 8080) |
| `--network <name>` | Docker network of your reverse proxy (`proxy` via network) |
| `--time-zone <zone>` | IANA time zone, e.g. `Europe/Berlin` |
| `--imprint <url>` | Link to an imprint or legal notice (empty for none) |
| `--password <password>` | Group password |
| `--generate-password` | Generate a memorable group password |
| `--build` | Build the images from this checkout instead of pulling them |
| `--pull` | Pull release images even if the checkout is not on a release tag |
| `-y`, `--yes` | Ask nothing; take flags and defaults |
| `--force` | With `--yes`: continue despite a failed domain check or a busy port |

```bash
./werewolf setup
./werewolf setup --mode lan --name "Kiez" --password "vollmond-heult-37" --yes
./werewolf setup --mode domain --domain werewolf.example.org --lang en --yes
./werewolf setup --mode proxy --proxy-via network --network proxy --domain werewolf.example.org --yes
```

### config

Changes the settings of an existing instance: group name, tagline, accent colour, logo, mode,
language, time zone, imprint link and backup retention. Interactively you pick what to change
and see the current values as defaults; with flags it changes exactly what you pass. Before
saving it shows every change. If the instance runs, Compose then recreates only the containers
whose configuration changed; switching the mode also removes the old mode's containers. A new
logo needs no restart.

It takes the same setting options as [`setup`](#options), plus:

| Option | Meaning |
| --- | --- |
| `--backup-retention <days>` | Days to keep backups (default 14) |

```bash
./werewolf config
./werewolf config --accent blood --name "Moonlight Pack" --yes
./werewolf config --mode lan --port 8081 --yes
./werewolf config --logo none --yes
```

### password

Sets a new group password. It also replaces the session secret, so everybody who is logged in
has to log in again with the new password.

| Option | Meaning |
| --- | --- |
| `--password <password>` | The new password |
| `--generate-password` | Generate a memorable one |
| `-y`, `--yes` | Ask nothing |

```bash
./werewolf password
./werewolf password --generate-password --yes
```

### status

Shows the version (and the checked-out release), which images run, the mode and URL, the health
of every container and the latest backup. It also tells you when a newer release is available.

### logs

Shows the logs of `web` and `api`. Name other services to see theirs: `db`, `backup`, `caddy`,
or `all`.

| Option | Meaning |
| --- | --- |
| `-f`, `--follow` | Keep following new log lines |
| `-n`, `--tail <lines>` | Lines per service to show first (default 100) |

```bash
./werewolf logs -f api
./werewolf logs --tail 500 all
```

### start, stop, restart

`start` starts the instance, `stop` stops it (the data stays). `restart` recreates all
containers, which also applies changes you made to `instance/.env` by hand.

### update

Updates to the newest release, or to the one you name with `--to`.

1. Refuses to run while tracked files in the checkout have local changes.
2. Fetches the release tags and shows the `CHANGELOG.md` entries between the installed and the
   new version, then asks before it changes anything.
3. Backs up the database (`pre-update-…`).
4. Checks out the release tag and pulls its images (or builds them, see
   [Images and versions](#images-and-versions)).
5. Starts the stack, which applies the database migrations, and checks that the app answers.

If the new version does not come up healthy, the update rolls back: it checks out the previous
version, runs the previous images and restores the database from the backup it just took,
because migrations only go forward. For the same reason it refuses to go back to an older
version unless you pass `--force`.

| Option | Meaning |
| --- | --- |
| `--to <version>` | Version to update to, e.g. `v1.2.0` (default: the newest release) |
| `--build` | Build the images from the checkout instead of pulling them |
| `--pull` | Pull release images even if the checkout is not on a release tag |
| `-y`, `--yes` | Ask nothing |
| `--force` | Allow going back to an older version |

### backup

Writes a gzipped `pg_dump` of the database to `instance/backups/manual-<timestamp>.sql.gz`.

Backups in `instance/backups/`:

| File | Written by |
| --- | --- |
| `werewolf-…` | the `backup` container, every night |
| `manual-…` | `./werewolf backup` |
| `pre-update-…`, `pre-restore-…`, `pre-uninstall-…` | `update`, `restore` and `uninstall`, before they change anything |
| `imported-…` | `restore`, when you restore a file from outside `instance/backups/` |

All of them are deleted after `BACKUP_RETENTION_DAYS` (default 14; change it with
`./werewolf config --backup-retention <days>`). Copy backups somewhere else if you want to keep
them longer or off the server.

### restore

Restores the database from a backup. Without a file it lets you pick one from
`instance/backups/`. Before it touches anything it backs up the current data
(`pre-restore-…`). It then stops the API, replaces the database, starts everything again and
checks that the app answers. Migrations bring a backup from an older version up to date. If the
restore fails, it puts the previous data back.

| Option | Meaning |
| --- | --- |
| `--file <file>` | Backup file: a name in `instance/backups/` or a path (also as a plain argument) |
| `-y`, `--yes` | Ask nothing |

```bash
./werewolf restore
./werewolf restore --file instance/backups/manual-20261029-081500.sql.gz --yes
```

### uninstall

Backs up the database (`pre-uninstall-…`), then removes the containers, the network and the
database volume. Without a successful backup nothing is removed. `instance/` stays, so you can
come back with `./werewolf start` and `./werewolf restore`. To remove everything, delete the
checkout afterwards.

| Option | Meaning |
| --- | --- |
| `-y`, `--yes` | Ask nothing |

### link

Puts a `werewolf` link to the launcher into `~/.local/bin` (or `--dir`), so you can run
`werewolf status` from anywhere. It tells you if that directory is not on your PATH.

| Option | Meaning |
| --- | --- |
| `--dir <dir>` | Directory on your PATH (default `~/.local/bin`) |
| `--remove` | Remove the link again |
| `--force` | Replace an existing file at that place |

## Images and versions

The checked-out commit decides which version runs:

- **On a release tag** (`git checkout v1.0.0`, or after `./werewolf update`), `setup` and
  `update` pull the matching multi-arch images from GHCR.
- **On any other commit**, for example `main` or a fork, they build the images from the
  checkout. That takes a few minutes and some disk space.

`--build` forces a local build, `--pull` forces pulling release images. Forks that publish
their own images set `IMAGE_PREFIX` in `instance/.env`.

## Troubleshooting

- **"Node.js 22.18 or newer is required"**: install a current Node, e.g. `nvm install 22` or
  `brew install node@22`, and run `./werewolf` again.
- **Docker permission denied**: add your user to the `docker` group (`sudo usermod -aG docker
  $USER`, then log in again) or run the CLI as a user who may use Docker.
- **Domain check fails**: the domain's A/AAAA record must point at this server, and nothing
  else may listen on ports 80 and 443. If another web server already uses those ports, use the
  `proxy` mode. Behind a NAT the check may not recognise the public address; continue anyway
  (or pass `--force` with `--yes`).
- **The app does not answer after setup**: look at `./werewolf logs all`. `./werewolf status`
  shows which container is unhealthy.
- **`update` refuses to run because of local changes**: `git status` shows them. Commit or
  stash them (or `git checkout -- <file>` to drop them); your settings in `instance/` are not
  affected.
- **Login says "too many attempts"**: after 10 wrong passwords from one client within 15
  minutes, the app refuses further attempts until the window ends.

Running without the CLI, all variables of `instance/.env` and the Compose overlays are
described in [self-hosting.md](./self-hosting.md).
