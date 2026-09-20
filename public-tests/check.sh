#!/usr/bin/env bash
set -euo pipefail

echo "Verificando estructura acumulativa..."

node scripts/verify.mjs --structure

required_files=(
  "package.json"
  "package-lock.json"
  "README.md"
  "START_HERE.md"
  "ACTIVIDAD-01.md"
  "docs/requirements.md"
  "docs/decision-record.md"
  "docs/cache-strategy.md"
  "evidence/individual.md"
  "public/manifest.webmanifest"
  "public/sw.js"
  "public/offline.html"
  "src/lib/pwa/register-service-worker.ts"
  "tests/service-worker.spec.ts"
  "tests/offline.spec.ts"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "ERROR: falta $file"
    exit 1
  fi

  echo "OK: $file"
done

echo "Estructura acumulativa correcta."
echo "PUBLIC_OK"
