#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${1:-"$ROOT_DIR/_site"}"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

find "$ROOT_DIR" -maxdepth 1 -type f -name '*.html' -exec cp {} "$OUT_DIR/" \;
cp -R "$ROOT_DIR/assets" "$OUT_DIR/assets"

mkdir -p \
  "$OUT_DIR/external/asteroid-belt-adventure" \
  "$OUT_DIR/external/game-of-life" \
  "$OUT_DIR/external/game-of-life/files/Media"

cp \
  "$ROOT_DIR/external/asteroid-belt-adventure/Asteroid-Rocket-Game.py" \
  "$ROOT_DIR/external/asteroid-belt-adventure/README.md" \
  "$ROOT_DIR/external/asteroid-belt-adventure/asteroid.png" \
  "$ROOT_DIR/external/asteroid-belt-adventure/comet.png" \
  "$ROOT_DIR/external/asteroid-belt-adventure/missile.png" \
  "$ROOT_DIR/external/asteroid-belt-adventure/rock.png" \
  "$ROOT_DIR/external/asteroid-belt-adventure/rocket.png" \
  "$OUT_DIR/external/asteroid-belt-adventure/"

cp \
  "$ROOT_DIR/external/game-of-life/README.md" \
  "$OUT_DIR/external/game-of-life/"

cp \
  "$ROOT_DIR/external/game-of-life/files/button.py" \
  "$ROOT_DIR/external/game-of-life/files/game_of_life.py" \
  "$ROOT_DIR/external/game-of-life/files/start_screen.py" \
  "$OUT_DIR/external/game-of-life/files/"

cp \
  "$ROOT_DIR/external/game-of-life/files/Media/logo.JPG" \
  "$OUT_DIR/external/game-of-life/files/Media/"

find "$OUT_DIR" -name '.DS_Store' -delete

touch "$OUT_DIR/.nojekyll"
