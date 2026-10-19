# docker buildx imagetools inspect --format='{{json .Manifest.Digest}}' node:current-alpine
FROM node:26.12.0-alpine@sha256:6f08a523443ddedf52941874c203475b0ad503e859ad70cb26ab8be9a517dbd5

COPY entrypoint /entrypoint
ARG GOSU_VERSION=1.19
ARG SETPRIV_VERSION=2.42.1
ARG UTIL_LINUX_VERSION=2.41
RUN chmod +x /entrypoint && /entrypoint --setup
ENTRYPOINT ["/entrypoint", "--", "npm"]