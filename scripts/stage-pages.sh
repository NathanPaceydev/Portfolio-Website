#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR_INPUT="${1:-"$ROOT_DIR/_site"}"
if [[ "$OUT_DIR_INPUT" = /* ]]; then
  OUT_DIR="$OUT_DIR_INPUT"
else
  OUT_DIR="$ROOT_DIR/$OUT_DIR_INPUT"
fi

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

DOWNLOADS_DIR="$OUT_DIR/downloads"
mkdir -p "$DOWNLOADS_DIR"

PACKAGE_TMP_DIR="$(mktemp -d)"
PACKAGE_DIR="$PACKAGE_TMP_DIR/virtual-power-plant-toolkit"
mkdir -p "$PACKAGE_DIR"

cp "$ROOT_DIR/external/virtual-power-plant-flask/app.py" "$PACKAGE_DIR/"
cp "$ROOT_DIR/external/virtual-power-plant-flask/requirements.txt" "$PACKAGE_DIR/"
cp -R "$ROOT_DIR/external/virtual-power-plant-flask/templates" "$PACKAGE_DIR/templates"
cp -R "$ROOT_DIR/external/virtual-power-plant-flask/static" "$PACKAGE_DIR/static"

cat > "$PACKAGE_DIR/run-vpp.command" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  echo "Python 3 is required to run the Virtual Power Plant toolkit."
  exit 1
fi

if [ ! -d ".venv" ]; then
  "$PYTHON_BIN" -m venv .venv
fi

source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

export HOST="${HOST:-127.0.0.1}"
export PORT="${PORT:-5050}"

if command -v open >/dev/null 2>&1; then
  (sleep 2; open "http://$HOST:$PORT/" >/dev/null 2>&1 || true) &
elif command -v xdg-open >/dev/null 2>&1; then
  (sleep 2; xdg-open "http://$HOST:$PORT/" >/dev/null 2>&1 || true) &
fi

python app.py
EOF

cat > "$PACKAGE_DIR/run-vpp.bat" <<'EOF'
@echo off
setlocal
cd /d %~dp0

where py >nul 2>&1
if %errorlevel%==0 (
  set PYTHON_BIN=py
) else (
  set PYTHON_BIN=python
)

if not exist .venv (
  %PYTHON_BIN% -m venv .venv
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

if not defined HOST set HOST=127.0.0.1
if not defined PORT set PORT=5050
start "" http://%HOST%:%PORT%/
python app.py
EOF

cat > "$PACKAGE_DIR/README-LOCAL-RUN.txt" <<'EOF'
Virtual Power Plant Toolkit
===========================

This package contains the full local Flask version of the toolkit used in the portfolio.

Quick start on macOS or Linux:
1. Open a terminal in this folder.
2. Run: bash run-vpp.command
3. Open http://127.0.0.1:5050/ in your browser if it does not open automatically.

Quick start on Windows:
1. Double-click run-vpp.bat
2. Open http://127.0.0.1:5050/ in your browser if it does not open automatically.

The first launch creates a local virtual environment and installs the Python dependencies.
Optional: set PORT or HOST before launching if 5050 is already in use.
EOF

chmod +x "$PACKAGE_DIR/run-vpp.command"

(
  cd "$PACKAGE_TMP_DIR"
  zip -rq "$DOWNLOADS_DIR/virtual-power-plant-toolkit.zip" "virtual-power-plant-toolkit"
)

rm -rf "$PACKAGE_TMP_DIR"

find "$OUT_DIR" -name '.DS_Store' -delete

touch "$OUT_DIR/.nojekyll"
