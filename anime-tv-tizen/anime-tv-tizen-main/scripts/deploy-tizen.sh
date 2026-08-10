#!/usr/bin/env bash
# Package and install the app on a connected Samsung Tizen TV as an update.
#
# Bumps the widget version in config.xml (optional), signs with SamsungTV-Dev,
# connects to the TV via sdb, then installs with `tizen install`
# (plain `sdb install` only pushes on TV 6.5).
#
# Prerequisites:
#   - TV in Developer Mode (Host PC IP = this machine) + Permit to install
#   - Same security profile / certs used for the already-installed build
#
# Usage:
#   npm run deploy:tizen
#   DEPLOY_VERSION=0.2.0 npm run deploy:tizen   # set exact version
#   SKIP_BUMP=1 npm run deploy:tizen             # keep current version
#   SKIP_LAUNCH=1 npm run deploy:tizen           # install only
#   TIZEN_TV_HOST=192.168.68.68 npm run deploy:tizen
#   SDB_SERIAL=192.168.68.68:26101 npm run deploy:tizen
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$ROOT/config.xml"
OUT_DIR="$ROOT/Debug"
WGT_NAME="AnimeTVApp.wgt"
WGT="$OUT_DIR/$WGT_NAME"
APP_ID="AnimeTVApp.App"

# Static living-room TV (override with TIZEN_TV_HOST / TIZEN_TV_PORT / SDB_SERIAL).
TV_HOST="${TIZEN_TV_HOST:-192.168.68.68}"
TV_PORT="${TIZEN_TV_PORT:-26101}"
SDB_SERIAL="${SDB_SERIAL:-${TV_HOST}:${TV_PORT}}"

find_tool() {
  local name="$1"
  shift
  local candidate
  for candidate in "$@"; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  if command -v "$name" >/dev/null 2>&1; then
    command -v "$name"
    return 0
  fi
  return 1
}

bump_patch_version() {
  local current="$1"
  local major minor patch
  IFS=. read -r major minor patch <<<"$current"
  major="${major:-0}"
  minor="${minor:-0}"
  patch="${patch:-0}"
  echo "${major}.${minor}.$((patch + 1))"
}

device_ready() {
  local sdb="$1" serial="$2"
  "$sdb" devices 2>/dev/null | awk -v s="$serial" '$1 == s && $2 == "device" { found=1 } END { exit !found }'
}

ensure_connected() {
  local sdb="$1" serial="$2"
  if device_ready "$sdb" "$serial"; then
    return 0
  fi
  echo "==> connecting $serial"
  # sdb prints "connected to …" or "is already connected" on success.
  if ! "$sdb" connect "$serial"; then
    echo "sdb connect failed for $serial (Developer Mode on? Host PC IP correct?)" >&2
    return 1
  fi
  sleep 1
  if ! device_ready "$sdb" "$serial"; then
    echo "Device not ready after connect: $serial" >&2
    "$sdb" devices >&2
    return 1
  fi
}

install_wgt() {
  local tizen="$1" sdb="$2" serial="$3"
  local remote_dir="/home/owner/share/tmp/sdk_tools/tmp"
  local log

  ensure_connected "$sdb" "$serial"

  # Prefer the same sdb binary tizen will spawn (same tools dir on PATH).
  echo "==> installing update $WGT (version $next_version) → $serial"
  if log="$("$tizen" install -n "$WGT_NAME" -s "$serial" -- "$OUT_DIR" 2>&1)"; then
    printf '%s\n' "$log"
    return 0
  fi
  printf '%s\n' "$log" >&2

  if ! printf '%s' "$log" | grep -qiE 'transfer|Fail install|no connected target|target not found'; then
    return 1
  fi

  echo "==> transfer failed; pushing via sdb then retrying install"
  ensure_connected "$sdb" "$serial"
  "$sdb" -s "$serial" push "$WGT" "$remote_dir/$WGT_NAME"
  "$tizen" install -n "$WGT_NAME" -s "$serial" -- "$OUT_DIR"
}

current_version="$(
  # Prefer the <widget version="x.y.z"> attribute (not <?xml version=...>).
  perl -0ne 'if (/<widget\b[^>]*\bversion="([0-9]+\.[0-9]+\.[0-9]+)"/s) { print $1; exit }' "$CONFIG"
)"
if [[ -z "$current_version" ]]; then
  echo "Could not read widget version from $CONFIG" >&2
  exit 1
fi

if [[ -n "${DEPLOY_VERSION:-}" ]]; then
  next_version="$DEPLOY_VERSION"
elif [[ "${SKIP_BUMP:-0}" == "1" ]]; then
  next_version="$current_version"
else
  next_version="$(bump_patch_version "$current_version")"
fi

if [[ "$next_version" != "$current_version" ]]; then
  echo "==> bumping widget version $current_version → $next_version"
  # Use ${1}/${2}: bare $10.1.4 is parsed as capture $10 + ".1.4" and corrupts the file.
  perl -0pi -e 's/(<widget\b[^>]*\bversion=")[^"]+(")/${1}'"$next_version"'${2}/s' "$CONFIG"
else
  echo "==> keeping widget version $current_version"
fi

# Match the active Certificate Manager profile used for TV installs.
export TIZEN_SECURITY_PROFILE="${TIZEN_SECURITY_PROFILE:-SamsungTV-Dev}"

echo "==> packaging"
bash "$ROOT/scripts/package-tizen.sh"

if [[ ! -f "$WGT" ]]; then
  echo "Missing package: $WGT" >&2
  exit 1
fi
if ! unzip -l "$WGT" | grep -q 'signature1.xml'; then
  echo "Refusing to install unsigned package: $WGT" >&2
  exit 1
fi

# Resolve tizen first, then prefer the sibling sdb so both share one sdb-server.
TIZEN="$(find_tool tizen \
  "${TIZEN_BIN:-}" \
  "$HOME/.tizen-extension-platform/server/sdktools/data/tools/ide/bin/tizen" \
  "$HOME/tizen-studio/tools/ide/bin/tizen"
)" || {
  echo "tizen CLI not found. Set TIZEN_BIN to tools/ide/bin/tizen" >&2
  exit 1
}

TIZEN_TOOLS="$(cd "$(dirname "$TIZEN")/../.." && pwd)"
SDB="$(find_tool sdb \
  "${SDB_BIN:-}" \
  "$TIZEN_TOOLS/sdb" \
  "$HOME/.tizen-extension-platform/server/sdktools/data/tools/sdb" \
  "$HOME/tizen-studio/tools/sdb"
)" || {
  echo "sdb not found. Set SDB_BIN to the Smart Development Bridge binary." >&2
  exit 1
}

export PATH="$(dirname "$SDB"):$(dirname "$TIZEN"):$PATH"

echo "==> sdb: $SDB"
ensure_connected "$SDB" "$SDB_SERIAL"
"$SDB" devices

install_wgt "$TIZEN" "$SDB" "$SDB_SERIAL"

if [[ "${SKIP_LAUNCH:-0}" != "1" ]]; then
  echo "==> launching $APP_ID"
  ensure_connected "$SDB" "$SDB_SERIAL"
  "$TIZEN" run -s "$SDB_SERIAL" -p "$APP_ID"
fi

echo "==> deploy done (AnimeTVApp $next_version)"
