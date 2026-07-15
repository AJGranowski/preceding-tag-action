# docker buildx imagetools inspect --format='{{json .Manifest.Digest}}' node:current-alpine
FROM node:26.5.0-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66

COPY entrypoint /entrypoint
ARG GOSU_VERSION=1.17
ARG SETPRIV_VERSION=2.40.1
ARG UTIL_LINUX_VERSION=2.39.3
RUN chmod +x /entrypoint && /entrypoint --setup
ENTRYPOINT ["/entrypoint", "--", "npm"]