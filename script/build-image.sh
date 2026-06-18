#!/usr/bin/env bash
#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
#
# Build channel-specific Docker images (e.g. prod-flowy, prod-gmk).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

DEFAULT_REGISTRY="registry.cn-beijing.aliyuncs.com/flowy-aipc/answer"
DEFAULT_ENV="prod"
DEFAULT_CHANNELS="flowy,gmk,international-flowy,international-gmk"

REGISTRY="${DEFAULT_REGISTRY}"
ENV_PREFIX="${DEFAULT_ENV}"
CHANNELS="${DEFAULT_CHANNELS}"
SINGLE_CHANNEL=""
CUSTOM_TAG=""
PUSH=false

usage() {
  cat <<'EOF'
Build channel-specific Docker images.

Usage:
  ./script/build-image.sh [options]

Options:
  -c, --channel CHANNEL     Build a single channel (e.g. flowy, gmk)
  --channels LIST           Comma-separated channels (default: flowy,gmk,international-flowy,international-gmk)
  -t, --tag TAG             Image tag; if omitted, uses {env}-{channel}
  -e, --env ENV             Tag prefix (default: prod) -> prod-flowy
  -r, --registry REGISTRY   Image repository
  --push                    Push images after build
  -h, --help                Show this help

Examples:
  ./script/build-image.sh --channel flowy --tag prod-flowy
  ./script/build-image.sh --channels flowy,gmk,international-flowy,international-gmk --env prod
  ./script/build-image.sh --channel international-gmk --tag prod-international-gmk
  ./script/build-image.sh --channel gmk --env prod --push
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -c|--channel)
      SINGLE_CHANNEL="$2"
      shift 2
      ;;
    --channels)
      CHANNELS="$2"
      shift 2
      ;;
    -t|--tag)
      CUSTOM_TAG="$2"
      shift 2
      ;;
    -e|--env)
      ENV_PREFIX="$2"
      shift 2
      ;;
    -r|--registry)
      REGISTRY="$2"
      shift 2
      ;;
    --push)
      PUSH=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -n "${SINGLE_CHANNEL}" ]]; then
  CHANNELS="${SINGLE_CHANNEL}"
fi

GIT_COMMIT="$(git -C "${ROOT_DIR}" rev-parse HEAD 2>/dev/null || echo unknown)"
BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

IFS=',' read -r -a CHANNEL_LIST <<< "${CHANNELS}"

# Trim and count non-empty channels
ACTIVE_CHANNELS=()
for ch in "${CHANNEL_LIST[@]}"; do
  ch="$(echo "${ch}" | xargs)"
  if [[ -n "${ch}" ]]; then
    ACTIVE_CHANNELS+=("${ch}")
  fi
done

if [[ ${#ACTIVE_CHANNELS[@]} -eq 0 ]]; then
  echo "Error: no channels specified" >&2
  exit 1
fi

if [[ -n "${CUSTOM_TAG}" && ${#ACTIVE_CHANNELS[@]} -gt 1 ]]; then
  echo "Error: --tag requires a single channel (use --channel)" >&2
  exit 1
fi

build_one() {
  local channel="$1"
  local tag="${ENV_PREFIX}-${channel}"
  if [[ -n "${CUSTOM_TAG}" ]]; then
    tag="${CUSTOM_TAG}"
  fi
  local image="${REGISTRY}:${tag}"

  echo "==> Building ${image} (CHANNEL=${channel})"

  docker build \
    --build-arg "CHANNEL=${channel}" \
    --build-arg "GIT_COMMIT=${GIT_COMMIT}" \
    --build-arg "BUILD_DATE=${BUILD_DATE}" \
    -t "${image}" \
    "${ROOT_DIR}"

  if [[ "${PUSH}" == "true" ]]; then
    echo "==> Pushing ${image}"
    docker push "${image}"
  fi
}

for channel in "${ACTIVE_CHANNELS[@]}"; do
  build_one "${channel}"
done

echo "Done."
