#!/usr/bin/env bash
# Rolls out the :latest images from GHCR on the server. Runs remotely:
#   ssh <server> bash -s -- <deploy-path> <repo-url> < ops/deploy.sh
# Expects docker-compose.yml + .env in the deploy path and a prior
# `docker login ghcr.io` (the deploy workflow takes care of both).
set -euo pipefail

cd "${1:?usage: deploy.sh <deploy-path> <repo-url>}"
repo_url="${2:?usage: deploy.sh <deploy-path> <repo-url>}"

echo "▶ Pulling images"
# docker pull on purpose instead of `compose pull`: the latter ignores pull errors for
# services with a build: section and would silently keep running the old image.
# GHCR images only: config --images also lists dependencies (postgres).
for image in $(docker compose config --images api web | grep '^ghcr\.io/'); do
  docker pull --quiet "$image"
done

if [ -n "$(docker compose ps --quiet --status running db)" ]; then
  file="pre-deploy-$(date +%Y%m%d-%H%M%S).sql.gz"
  echo "▶ Database backup before migrations → ops/backups/$file"
  # Inside the backup container (root, PG* env set), independent of host file permissions.
  docker compose run --rm --no-deps -T -e FILE="$file" --entrypoint sh backup \
    -c 'set -o pipefail; pg_dump | gzip > "/backups/$FILE"'
fi

echo "▶ Updating containers"
if ! docker compose up --detach --no-build --wait --wait-timeout 180; then
  docker compose ps
  docker compose logs --tail 80 api web
  echo "✗ Containers are not healthy" >&2
  exit 1
fi

docker compose ps
for svc in api web; do
  echo "$svc @ $(docker inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$(docker compose ps --quiet "$svc")")"
done

# Only prune this project's untagged images; other projects stay untouched.
docker image prune --force --filter "label=org.opencontainers.image.source=$repo_url" > /dev/null
echo "✓ Deploy finished"
