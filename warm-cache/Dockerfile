FROM alpine:latest

RUN apk add --no-cache curl libxml2-utils bash

COPY warmcache.sh /warmcache.sh

ENTRYPOINT ["/warmcache.sh"]