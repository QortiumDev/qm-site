#!/usr/bin/env bash
# Re-encode the background music track published as qdn://AUDIO/QuickMythril/qm-site-bgm.
#
# The mp3 is deliberately not committed: it is ~3.4 MB of binary that would bloat clones,
# and it is published as its own QDN resource rather than bundled into the site.
set -euo pipefail

SOURCE="${1:-$HOME/Music/stems/Lice - The Burgers (instrumental 6stem).mp3}"
OUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/audio"

mkdir -p "$OUT_DIR"
ffmpeg -y -v error -i "$SOURCE" \
  -b:a 96k -ac 2 -ar 44100 \
  -map_metadata -1 -id3v2_version 3 \
  -metadata title="The Burgers (instrumental)" \
  -metadata artist="Lice" \
  "$OUT_DIR/qm-site-bgm.mp3"

echo "Wrote $OUT_DIR/qm-site-bgm.mp3"
