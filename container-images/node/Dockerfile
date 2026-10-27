# docker buildx imagetools inspect --format='{{json .Manifest.Digest}}' node:current-alpine
FROM node:26.12.1-alpine@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797

COPY entrypoint /entrypoint
ARG GOSU_VERSION=1.19
ARG SETPRIV_VERSION=2.42.1
ARG UTIL_LINUX_VERSION=2.41
RUN chmod +x /entrypoint && /entrypoint --setup
ENTRYPOINT ["/entrypoint", "--", "npm"]