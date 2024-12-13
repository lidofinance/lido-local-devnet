FROM ghcr.io/foundry-rs/foundry:nightly-59f354c179f4e7f6d7292acb3d068815c79286d1 as foundry

FROM node:20.12.2-alpine3.19 as node

RUN apk add --no-cache git curl bash

COPY --from=foundry /usr/local/bin/forge /usr/local/bin/forge
COPY --from=foundry /usr/local/bin/cast /usr/local/bin/cast
COPY --from=foundry /usr/local/bin/anvil /usr/local/bin/anvil
COPY --from=foundry /usr/local/bin/chisel /usr/local/bin/chisel

WORKDIR /var/lido-core

COPY lido-core .

# test foundry
RUN cast from-utf8 "foundry test OK"

RUN yarn set version 4.5.0 && \
    yarn install

ENTRYPOINT ["sleep", "infinity"]
