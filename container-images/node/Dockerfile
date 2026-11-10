# docker buildx imagetools inspect --format='{{json .Manifest.Digest}}' node:current-alpine
FROM node:26.13.0-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216

COPY entrypoint /entrypoint
ARG GOSU_VERSION=1.19
ARG SETPRIV_VERSION=2.42.1
ARG UTIL_LINUX_VERSION=2.41
RUN chmod +x /entrypoint && /entrypoint --setup
ENTRYPOINT ["/entrypoint", "--", "npm"]