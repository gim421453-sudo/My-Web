#!/bin/sh
set -eu

export VITE_APP_TARGET=admin-standalone
npm run build:admin
exec node scripts/static-preview.cjs
