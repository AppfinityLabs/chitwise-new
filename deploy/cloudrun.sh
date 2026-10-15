#!/usr/bin/env bash
# Build on Cloud Build and deploy to Cloud Run.
# Usage: deploy/cloudrun.sh            (env from .env.local + deploy/production.env)
set -euo pipefail

PROJECT="${GCP_PROJECT:-chitwise-appfinity}"
REGION="${GCP_REGION:-asia-south1}"
ACCOUNT="${GCLOUD_ACCOUNT:-appfinitylabs2025@gmail.com}"
SERVICE=chitwise-web
REPO=chitwise

cd "$(dirname "$0")/.."
g() { gcloud --quiet --account="$ACCOUNT" --project="$PROJECT" "$@"; }

TAG="$(git rev-parse --short HEAD)$(git diff --quiet HEAD || echo "-dirty-$(date +%s)")"
IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/$SERVICE:$TAG"

echo "==> Enabling APIs (no-op if already on)"
g services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com firebasehosting.googleapis.com

if ! g artifacts repositories describe "$REPO" --location="$REGION" >/dev/null 2>&1; then
  echo "==> Creating Artifact Registry repo $REPO"
  g artifacts repositories create "$REPO" --repository-format=docker --location="$REGION"
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
python3 deploy/render_env.py "$TMP" "$IMAGE" .env.local deploy/production.env

echo "==> Building $IMAGE"
g builds submit --region="$REGION" --config="$TMP/cloudbuild.yaml" .

echo "==> Deploying $SERVICE"
g run deploy "$SERVICE" \
  --image="$IMAGE" \
  --region="$REGION" \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --env-vars-file="$TMP/runtime.yaml"

g run services describe "$SERVICE" --region="$REGION" --format='value(status.url)'

# Firebase Hosting fronts Cloud Run for the custom domain (Cloud Run domain
# mapping is not available in asia-south1). A new release also purges the CDN
# cache, so pages cached from the previous build don't reference stale chunks.
echo "==> Releasing Firebase Hosting -> $SERVICE"
SITE="$PROJECT"
HOSTING="https://firebasehosting.googleapis.com/v1beta1/sites/$SITE"
TOKEN="$(gcloud auth print-access-token --account="$ACCOUNT")"
api() { curl -fsS -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROJECT" -H "Content-Type: application/json" "$@"; }

VERSION="$(api -X POST "$HOSTING/versions" -d '{
  "config": { "rewrites": [ { "glob": "**", "run": { "serviceId": "'"$SERVICE"'", "region": "'"$REGION"'" } } ] }
}' | python3 -c 'import json,sys; print(json.load(sys.stdin)["name"])')"
api -X PATCH "https://firebasehosting.googleapis.com/v1beta1/$VERSION?update_mask=status" -d '{"status":"FINALIZED"}' >/dev/null
api -X POST "$HOSTING/releases?versionName=$VERSION" -d '{}' >/dev/null
echo "Live: https://$SITE.web.app"
