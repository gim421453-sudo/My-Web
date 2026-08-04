#!/bin/sh
set -eu

export VITE_APP_TARGET=main
exec npm run dev -- --host 0.0.0.0 --port 3000 --strictPort
