#!/usr/bin/env bash
# Build a flat, CLI-signed .wgt suitable for Samsung Tizen TV.
#
# Prerequisites:
#   - npm dependencies installed
#   - Security profile pointing at SamsungTV-Dev author+distributor certs
#   - Optional: TIZEN_SECURITY_PROFILE (default: SamsungTV-Dev)
#
# Usage:
#   npm run package:tizen
#   npm run deploy:tizen
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$ROOT/.tizen-pkg"
OUT_DIR="$ROOT/Debug"
PROFILE="${TIZEN_SECURITY_PROFILE:-SamsungTV-Dev}"

TIZEN_BIN="${TIZEN_BIN:-}"
if [[ -z "$TIZEN_BIN" ]]; then
  for candidate in \
    "$HOME/.tizen-extension-platform/server/sdktools/data/tools/ide/bin/tizen" \
    "$HOME/tizen-studio/tools/ide/bin/tizen"
  do
    if [[ -x "$candidate" ]]; then
      TIZEN_BIN="$candidate"
      break
    fi
  done
fi

if [[ -z "${TIZEN_BIN}" || ! -x "$TIZEN_BIN" ]]; then
  echo "tizen CLI not found. Set TIZEN_BIN to tools/ide/bin/tizen" >&2
  exit 1
fi

echo "==> npm run build"
cd "$ROOT"
npm run build

echo "==> staging flat package in .tizen-pkg/"
rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -R "$ROOT/dist/." "$STAGE/"
# Flat content path for staged package
sed 's|content src="dist/index.html"|content src="index.html"|' \
  "$ROOT/config.xml" > "$STAGE/config.xml"
if [[ -f "$ROOT/icon.png" ]]; then
  cp "$ROOT/icon.png" "$STAGE/icon.png"
fi
find "$STAGE" -name '*.map' -delete
find "$STAGE" -name '.DS_Store' -delete

mkdir -p "$OUT_DIR"
echo "==> tizen package (profile: $PROFILE)"
rm -f "$STAGE"/*.wgt

(
  cd "$STAGE"
  "$TIZEN_BIN" package -t wgt -s "$PROFILE" -- .
)

WGT="$(find "$STAGE" -maxdepth 1 -name '*.wgt' | head -1)"
if [[ -z "$WGT" ]]; then
  echo "Packaging failed: no .wgt produced in $STAGE" >&2
  exit 1
fi

# Verify signatures exist (CLI sometimes packs without signing if profile is broken)
if ! unzip -l "$WGT" | grep -q 'signature1.xml'; then
  echo "WARNING: $WGT has no signature1.xml — profile '$PROFILE' did not sign." >&2
  echo "Fix Certificate Manager profile to use:" >&2
  echo "  ~/SamsungCertificate/SamsungTV-Dev/author.p12" >&2
  echo "  ~/SamsungCertificate/SamsungTV-Dev/distributor.p12" >&2
  echo "Then re-run, or use the extension: Build Signed Package / Run Project." >&2
fi

DEST="$OUT_DIR/AnimeTVApp.wgt"
cp "$WGT" "$DEST"
echo "==> wrote $DEST ($(wc -c < "$DEST") bytes)"
unzip -l "$DEST" | head -40
