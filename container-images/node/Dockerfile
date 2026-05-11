# docker buildx imagetools inspect --format='{{json .Manifest.Digest}}' node:current-alpine
FROM node:26.1.0-alpine@sha256:e71ac5e964b9201072425d59d2e876359efa25dc96bb1768cb73295728d6e4ea

COPY entrypoint /entrypoint
ARG GOSU_VERSION=1.17
ARG SETPRIV_VERSION=2.40.1
ARG UTIL_LINUX_VERSION=2.39.3
RUN chmod +x /entrypoint && /entrypoint --setup
ENTRYPOINT ["/entrypoint", "--", "npm"]