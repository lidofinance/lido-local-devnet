# ============================================================
# Stage 1: builder — install dependencies and compile CLI
# ============================================================
FROM node:22-bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    git ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare yarn@4.2.2 --activate

WORKDIR /app

# Copy source
COPY . .

# Init fake git repo so postinstall "git submodule update" doesn't fail
RUN git config --global user.email "devnet@lido.fi" \
    && git config --global user.name "devnet" \
    && git init && git commit --allow-empty -m "init"

# Install and build
RUN yarn install --immutable \
    && yarn build \
    && yarn cache clean --all \
    && rm -rf .yarn/cache .yarn/install-state.gz

# ============================================================
# Stage 2: runtime — minimal image with CLI and system tools
# ============================================================
FROM node:22-bookworm-slim

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    make \
    jq \
    python3 \
    python3-pip \
    python3-venv \
    ssh \
    ca-certificates \
    gnupg \
    tmux \
    && rm -rf /var/lib/apt/lists/*

# kubectl
RUN curl -fsSL https://dl.k8s.io/release/v1.31.0/bin/linux/amd64/kubectl \
    -o /usr/local/bin/kubectl && chmod +x /usr/local/bin/kubectl

# Helm
RUN curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash \
    && rm -rf /root/.cache

# Docker CLI (only client — daemon provided externally)
RUN ARCH=$(dpkg --print-architecture) \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable" \
    > /etc/apt/sources.list.d/docker.list \
    && apt-get update && apt-get install -y --no-install-recommends \
         docker-ce-cli \
         docker-buildx-plugin \
    && rm -rf /var/lib/apt/lists/*

# Kurtosis
RUN echo "deb [trusted=yes] https://apt.fury.io/kurtosis-tech/ /" \
    > /etc/apt/sources.list.d/kurtosis.list \
    && apt-get update && apt-get install -y --no-install-recommends kurtosis-cli=1.12.1 \
    && rm -rf /var/lib/apt/lists/*

# Foundry (only forge and cast — anvil and chisel not needed in pod)
RUN curl -L https://foundry.paradigm.xyz | bash \
    && /root/.foundry/bin/foundryup \
    && cp /root/.foundry/bin/forge /usr/local/bin/ \
    && cp /root/.foundry/bin/cast /usr/local/bin/ \
    && rm -rf /root/.foundry

# Just
RUN curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /usr/local/bin

# Yarn (corepack)
RUN corepack enable && corepack prepare yarn@4.2.2 --activate

# Copy built CLI from builder
WORKDIR /app
COPY --from=builder /app /app

# Copy cli-pod specific .env (registry hostname, ingress settings)
# DEVNET_NAME is intentionally omitted so it gets auto-generated per run
COPY workspaces/cli-pod/.env /app/.env

# Rewrite SSH GitHub URLs to HTTPS (for public repos we don't need auth).
# Use --add to register multiple insteadOf entries (they map to the same HTTPS URL).
RUN git config --global --add url."https://github.com/".insteadOf "git@github.com:" \
    && git config --global --add url."https://github.com/".insteadOf "ssh://git@github.com/"

# Entrypoint: configure buildx to use BuildKit sidecar, then keep pod alive
COPY workspaces/cli-pod/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

CMD ["/usr/local/bin/entrypoint.sh"]
