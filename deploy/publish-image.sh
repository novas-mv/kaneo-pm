#!/usr/bin/env bash
# Build the Kaneo image on this computer and push it to GitHub Container Registry.
#
#   ./deploy/publish-image.sh
#
# Fallback for the "Publish Kaneo image" workflow. It builds whatever commit is
# checked out and pushes it as :main (what compose.coolify.fork.yml runs) and
# :<full commit SHA>. Run it from a clean checkout, then redeploy in Coolify.
#
# One-time setup: Docker running, and `docker login ghcr.io -u <github-user>`
# with a personal access token that has the write:packages permission.
#
# Environment overrides: GHCR_OWNER (default novas-mv), PLATFORM (default
# linux/amd64; use linux/arm64 for an ARM server).

set -euo pipefail
cd "$(dirname "$0")/.."

OWNER="${GHCR_OWNER:-novas-mv}"
PLATFORM="${PLATFORM:-linux/amd64}"
IMAGE="ghcr.io/${OWNER}/kaneo-pm"

if [ -n "$(git status --porcelain)" ]; then
  echo "You have uncommitted changes. Commit or stash them so the tag matches what is built." >&2
  exit 1
fi

TAG="$(git rev-parse HEAD)"
echo "Building ${IMAGE}:${TAG} for ${PLATFORM} ..."

if ! docker buildx build --platform "${PLATFORM}" -f Dockerfile.kaneo \
  -t "${IMAGE}:${TAG}" -t "${IMAGE}:main" --push .; then
  echo >&2
  echo "The build or push failed. If it says 'unauthorized' or 'denied', run:" >&2
  echo "  docker login ghcr.io -u <your-github-username>" >&2
  echo "and use a token with the write:packages permission as the password." >&2
  exit 1
fi

echo
echo "Published ${IMAGE}:${TAG} and ${IMAGE}:main"
echo "Next: redeploy the Kaneo app in Coolify."
