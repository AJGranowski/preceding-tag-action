# docker buildx imagetools inspect --format='{{json .Manifest.Digest}}' node:current-alpine
FROM node:26.5.1-alpine@sha256:233761595746769ebfdb6090f44fc7cdf818ae0ce62d2b37e0367723b9823e36

COPY entrypoint /entrypoint
ARG GOSU_VERSION=1.19
ARG SETPRIV_VERSION=2.42.1
ARG UTIL_LINUX_VERSION=2.41
RUN chmod +x /entrypoint && /entrypoint --setup
ENTRYPOINT ["/entrypoint", "--", "npm"]