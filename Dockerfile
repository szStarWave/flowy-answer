# syntax=docker/dockerfile:1.4
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
# Build with BuildKit: DOCKER_BUILDKIT=1 docker build ...
# Cache mounts speed up repeat builds; GOPROXY lists multiple mirrors to avoid goproxy.cn EOF.

FROM golang:1.24-alpine AS golang-builder
LABEL maintainer="linkinstar@apache.org"

# 多源回退；goproxy.cn 偶发 unexpected EOF，故不把其放首位。国内可：--build-arg GOPROXY=https://goproxy.cn,direct
ARG GOPROXY=https://goproxy.cn,https://proxy.golang.org,https://goproxy.io,direct
ENV GOPROXY=${GOPROXY}
ARG GOSUMDB=sum.golang.google.cn
ENV GOSUMDB=${GOSUMDB}

ENV GOPATH=/go
ENV GOROOT=/usr/local/go
ENV PACKAGE=github.com/apache/answer
ENV BUILD_DIR=${GOPATH}/src/${PACKAGE}
ENV ANSWER_MODULE=${BUILD_DIR}

ARG TAGS="sqlite sqlite_unlock_notify"
ENV TAGS="bindata timetzdata ${TAGS}"
ARG CGO_EXTRA_CFLAGS
# 构建渠道（flowy / gmk 等），决定首页横幅等 UI 资源
ARG CHANNEL=flowy
ENV CHANNEL=${CHANNEL}

COPY . ${BUILD_DIR}
WORKDIR ${BUILD_DIR}
ENV npm_config_cache=/npm-cache
# apk 与 BuildKit 在 Windows/Docker Desktop 上偶发 gcc 解压 I/O / integrity 错误：先 update，再分包安装，
# build-base（含 gcc）单独一层便于仅重试该层；仍失败时请 docker builder prune、检查磁盘与 WSL2。
RUN apk update
RUN apk --no-cache add git bash nodejs npm
RUN apk --no-cache add build-base

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/npm-cache \
    --mount=type=cache,target=/root/.local/share/pnpm \
    npm install -g pnpm@9.7.0 \
    && make clean \
    && make ui \
    && sed -i 's/\r$//' script/build_plugin.sh \
    && bash script/build_plugin.sh \
    && make build \
    && chmod 755 answer \
    && test -s ui/build/index.html \
    && test -d ui/build/static
RUN cp answer /usr/bin/answer

RUN mkdir -p /data/uploads && chmod 777 /data/uploads \
    && mkdir -p /data/i18n && cp -r i18n/*.yaml /data/i18n
RUN mkdir -p /opt/answer-src \
    && tar -C ${BUILD_DIR} \
      --exclude='./ui/node_modules' \
      --exclude='./.git' \
      -cf - . | tar -C /opt/answer-src -xf -

FROM alpine
LABEL maintainer="linkinstar@apache.org"
# 与线上对照：docker build --build-arg GIT_COMMIT=$(git rev-parse HEAD) --build-arg BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) ...
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown
ARG CHANNEL=flowy
LABEL org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.flowy.channel="${CHANNEL}"

ARG TIMEZONE
ENV TIMEZONE=${TIMEZONE:-"Asia/Shanghai"}

RUN apk update \
    && apk --no-cache add \
        bash \
        ca-certificates \
        curl \
        dumb-init \
        gettext \
        openssh \
        sqlite \
        gnupg \
        tzdata \
    && ln -sf /usr/share/zoneinfo/${TIMEZONE} /etc/localtime \
    && echo "${TIMEZONE}" > /etc/timezone

COPY --from=golang-builder /usr/bin/answer /usr/bin/answer
COPY --from=golang-builder /data /data
COPY --from=golang-builder /opt/answer-src /opt/answer-src
COPY /script/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod 755 /entrypoint.sh

VOLUME /data
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
