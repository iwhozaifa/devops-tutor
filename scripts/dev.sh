#!/usr/bin/env bash
# Start `next dev` inside its own memory-limited cgroup.
#
# Without a cap, a dev server that balloons (Turbopack compiling many routes,
# repeated HMR) pushes a low-RAM machine into swap thrashing and the whole
# desktop freezes before anything gets killed. With a cap, only this process
# is throttled (MemoryHigh) or, at worst, killed (MemoryMax), and the rest of
# the system stays responsive.
#
# Override the limits per machine, e.g.  DEV_MEMORY_MAX=4G npm run dev
set -euo pipefail

MEMORY_HIGH="${DEV_MEMORY_HIGH:-2G}"
MEMORY_MAX="${DEV_MEMORY_MAX:-3G}"
SWAP_MAX="${DEV_SWAP_MAX:-512M}"

# Bound the V8 heap too, so Node GCs harder instead of growing until the cap.
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=${DEV_NODE_HEAP_MB:-1536}"

if command -v systemd-run >/dev/null 2>&1 && systemctl --user show-environment >/dev/null 2>&1; then
  exec systemd-run --user --scope --quiet --same-dir \
    -p MemoryHigh="$MEMORY_HIGH" \
    -p MemoryMax="$MEMORY_MAX" \
    -p MemorySwapMax="$SWAP_MAX" \
    -- npx next dev "$@"
fi

echo "systemd user session not available; starting next dev without a memory cap" >&2
exec npx next dev "$@"
