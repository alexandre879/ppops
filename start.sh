#!/usr/bin/env bash
# Starts the development stack (database, Redis, backend, website, admin) and
# waits until every app responds. Run ./start.sh once; after that `start proj`
# works from any folder in a new terminal.
set -euo pipefail
cd "$(dirname "$0")"

compose() { docker compose -f docker-compose.dev.yml "$@"; }

# Retries a command every 2 seconds for up to 5 minutes.
wait_until() {
  for _ in $(seq 150); do
    "$@" >/dev/null 2>&1 && return 0
    sleep 2
  done
  return 1
}

# Adds a `start proj` command to bash, zsh and fish. Runs on every start but only
# writes when the command is missing or points at a checkout that has moved.
install_shortcut() {
  local script="$PWD/start.sh"
  local begin="# >>> ppops: start proj >>>" end="# <<< ppops: start proj <<<"
  local added="" rc
  local rcs=("$HOME/.bashrc")
  # Login bash shells (macOS terminals, VS Code) skip ~/.bashrc unless ~/.bash_profile loads it.
  if [ -f "$HOME/.bash_profile" ] && ! grep -q bashrc "$HOME/.bash_profile"; then
    rcs+=("$HOME/.bash_profile")
  fi
  if command -v zsh >/dev/null 2>&1; then rcs+=("$HOME/.zshrc"); fi

  for rc in "${rcs[@]}"; do
    grep -qF "\"$script\"" "$rc" 2>/dev/null && continue
    if grep -qF "$begin" "$rc" 2>/dev/null; then
      awk -v b="$begin" -v e="$end" '$0 == b { skip = 1 } !skip { print } $0 == e { skip = 0 }' "$rc" > "$rc.ppops-tmp"
      cat "$rc.ppops-tmp" > "$rc" && rm "$rc.ppops-tmp"
    fi
    # Anything other than `start proj` goes to whatever `start` command already exists.
    printf '\n%s\nstart() {\n  if [ "$1" = proj ]; then "%s"; else command start "$@"; fi\n}\n%s\n' \
      "$begin" "$script" "$end" >> "$rc"
    added="$added ~${rc#"$HOME"}"
  done

  if command -v fish >/dev/null 2>&1; then
    rc="$HOME/.config/fish/functions/start.fish"
    # Never overwrite a start.fish we didn't write.
    if ! grep -qF "\"$script\"" "$rc" 2>/dev/null && { [ ! -e "$rc" ] || grep -qF "$begin" "$rc"; }; then
      mkdir -p "$(dirname "$rc")"
      printf '%s\nfunction start\n    if test "$argv[1]" = proj\n        "%s"\n    else\n        command start $argv\n    end\nend\n%s\n' \
        "$begin" "$script" "$end" > "$rc"
      added="$added ~${rc#"$HOME"}"
    fi
  fi

  if [ -n "$added" ]; then
    echo "Added the 'start proj' command to:$added. Open a new terminal to use it."
  fi
}

install_shortcut

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose isn't installed. Arch: sudo pacman -S docker-compose docker-buildx" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  if [ "$(uname)" = Darwin ]; then
    echo "Starting Docker..."
    open -a Docker
    wait_until docker info || { echo "Docker didn't start. Open Docker Desktop and try again." >&2; exit 1; }
  else
    docker info 2>&1 | grep -iE 'cannot connect|permission denied' | head -1 >&2 || true
    echo "Start Docker with: sudo systemctl start docker" >&2
    echo "On 'permission denied': sudo usermod -aG docker \$USER, then log out and back in." >&2
    exit 1
  fi
fi

# Mount points for the volumes in docker-compose.dev.yml. Creating them first keeps
# Docker on Linux from creating them as root inside the checkout.
mkdir -p web/node_modules web/.next admin/node_modules admin/.next \
  backend/media backend/private_media backend/staticfiles

compose up --build -d

echo "Waiting for the apps to respond..."
for url in http://localhost:8000/api/health/ http://localhost:3000/ http://localhost:3001/login; do
  wait_until curl -fs "$url" || {
    echo "$url isn't responding. Check: docker compose -f docker-compose.dev.yml logs" >&2
    exit 1
  }
done

cat <<EOF

Project is running:
  Website   http://localhost:3000
  Admin     http://localhost:3001   admin@newhousemodern.ge / ChangeMe-2026!
  API docs  http://localhost:8000/api/docs/

Logs:  docker compose -f docker-compose.dev.yml logs -f
Stop:  docker compose -f docker-compose.dev.yml down
EOF
