# Based in branch feat/oracle-v6
# https://github.com/lidofinance/lido-oracle/commit/e5f44e619116ded46dc7e240ebbc57fdbb0a28cb
#
# Changes:
# 1. Removed dev-stage
# 2. Added debugpy (+ 5678 port exposion)

FROM python:3.12.4-slim AS base

ARG POETRY_VERSION=1.3.2
ARG SOURCE_DATE_EPOCH

RUN apt-get update && apt-get install -y --no-install-recommends -qq \
    libffi-dev=3.4.4-1 \
    g++=4:12.2.0-3 \
    curl=7.88.1-10+deb12u12 \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/* \
 && rm -rf /var/cache/* \
 && rm -rf /var/log/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100 \
    POETRY_VIRTUALENVS_IN_PROJECT=false \
    POETRY_NO_INTERACTION=1 \
    VENV_PATH="/opt/venv" \
    # Building reproducible .so files by enforcing consistent CFLAGS across builds
    CFLAGS="-g0 -O2 -ffile-prefix-map=/src=."

ENV PATH="$VENV_PATH/bin:$PATH"

FROM base AS builder

ARG POETRY_VERSION
RUN pip install --no-cache-dir poetry==${POETRY_VERSION}

WORKDIR /
COPY pyproject.toml poetry.lock ./

RUN python3 -m venv "$VENV_PATH" && \
    VIRTUAL_ENV="$VENV_PATH" poetry install --only main --no-root --no-cache && \
    VIRTUAL_ENV="$VENV_PATH" poetry add debugpy==1.8.13 --no-cache && \
    find "$VENV_PATH" -type d -name '.git' -exec rm -rf {} + && \
    find "$VENV_PATH" -name '*.dist-info' -exec rm -rf {}/RECORD \; && \
    find "$VENV_PATH" -name '*.dist-info' -exec rm -rf {}/WHEEL \; && \
    find "$VENV_PATH" -name '__pycache__' -exec rm -rf {} +

FROM base AS production

COPY --from=builder $VENV_PATH $VENV_PATH
WORKDIR /app
COPY . .

RUN apt-get clean && find /var/lib/apt/lists/ -type f -delete && chown -R www-data /app/

ENV PROMETHEUS_PORT 9000
ENV HEALTHCHECK_SERVER_PORT 9010

EXPOSE $PROMETHEUS_PORT
EXPOSE 5678
USER www-data

HEALTHCHECK --interval=10s --timeout=3s \
    CMD curl -f http://localhost:$HEALTHCHECK_SERVER_PORT/healthcheck || exit 1

WORKDIR /app/

ENTRYPOINT ["/opt/venv/bin/python3", "-Xfrozen_modules=off", "-m", "debugpy", "--listen", "0.0.0.0:5678", "-m", "src.main"]
