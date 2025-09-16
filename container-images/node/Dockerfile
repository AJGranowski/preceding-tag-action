# docker buildx imagetools inspect --format='{{json .Manifest.Digest}}' node:current-alpine
FROM node:24.8.0-alpine@sha256:3e843c608bb5232f39ecb2b25e41214b958b0795914707374c8acc28487dea17

COPY entrypoint /entrypoint
ARG GOSU_VERSION=1.17
ARG SETPRIV_VERSION=2.40.1
ARG UTIL_LINUX_VERSION=2.39.3
RUN chmod +x /entrypoint && /entrypoint --setup
ENTRYPOINT ["/entrypoint", "--", "npm"]