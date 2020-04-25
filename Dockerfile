ARG NODE_VERSION=12-alpine

FROM node:${NODE_VERSION} AS base
WORKDIR /opt/base

### Kafka dependencies
RUN apk --no-cache add \
      bash \
      g++ \
      ca-certificates \
      lz4-dev \
      musl-dev \
      cyrus-sasl-dev \
      openssl-dev \
      make \
      python \
      git

RUN apk add --no-cache --virtual .build-deps gcc zlib-dev libc-dev bsd-compat-headers py-setuptools bash
###

COPY package.json yarn.lock /opt/base/
RUN yarn --pure-lockfile

# Build Image
FROM node:${NODE_VERSION} AS build
WORKDIR /opt/build

### Kafka dependencies
RUN apk --no-cache add lz4-libs libsasl
###

COPY --from=base /opt/base/node_modules ./node_modules
COPY src /opt/build/src
COPY package.json yarn.lock tsconfig.json tslint.json /opt/build/

RUN yarn build

CMD ["sh", "-c", "sleep 10; yarn test"]