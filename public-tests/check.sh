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
  "docs/rendering-decision.md"
  "evidence/individual.md"
  "public/manifest.webmanifest"
  "public/sw.js"
  "public/offline.html"
  "src/lib/pwa/register-service-worker.ts"
  "src/app/inspecciones/page.tsx"
  "src/app/inspecciones/[id]/page.tsx"
  "src/app/inspecciones/[id]/loading.tsx"
  "src/app/inspecciones/[id]/error.tsx"
  "src/app/inspecciones/[id]/not-found.tsx"
  "src/components/loading-state.tsx"
  "src/lib/data/inspection-detail.ts"
  "tests/service-worker.spec.ts"
  "tests/offline.spec.ts"
  "tests/rendering.spec.ts"
  ".github/workflows/week-04-w04-csr-ssr.yml"
  "src/lib/storage/schema.ts"
  "src/lib/sync/queue.ts"
  "tests/sync.spec.ts"
  "src/lib/sync/conflict-policy.ts"
  "docs/sync-policy.md"
  ".github/workflows/week-05-w05-sync-data.yml"
  "src/lib/device/camera.ts"
  "src/components/inspection-capabilities.tsx"
  "docs/capabilities.md"
  "tests/capabilities.spec.ts"
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
