#!/usr/bin/env bash
# Build the Flutter org app for the web and place it at public/mobile,
# served by Next.js at /mobile (same origin, so API calls use relative URLs).
# Usage: deploy/build-mobile-web.sh        (FLUTTER_APP_DIR overrides the app path)
set -euo pipefail

cd "$(dirname "$0")/.."
APP_DIR="${FLUTTER_APP_DIR:-../chitwise-org-flutter}"
OUT="$PWD/public/mobile"

if [ ! -f "$APP_DIR/pubspec.yaml" ]; then
  echo "Flutter app not found at $APP_DIR (set FLUTTER_APP_DIR)" >&2
  exit 1
fi

echo "==> Building Flutter web from $APP_DIR ($(git -C "$APP_DIR" rev-parse --short HEAD))"
(
  cd "$APP_DIR"
  flutter pub get >/dev/null
  # Empty API_BASE_URL: requests go to the same origin that serves /mobile
  flutter build web --release --base-href /mobile/ --pwa-strategy=none \
    --dart-define=API_BASE_URL=
)

rm -rf "$OUT"
cp -R "$APP_DIR/build/web" "$OUT"
echo "==> Copied to public/mobile"
