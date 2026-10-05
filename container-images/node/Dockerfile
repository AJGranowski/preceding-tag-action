# docker buildx imagetools inspect --format='{{json .Manifest.Digest}}' node:current-alpine
FROM node:26.10.0-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80

COPY entrypoint /entrypoint
ARG GOSU_VERSION=1.19
ARG SETPRIV_VERSION=2.42.1
ARG UTIL_LINUX_VERSION=2.41
RUN chmod +x /entrypoint && /entrypoint --setup
ENTRYPOINT ["/entrypoint", "--", "npm"]