# Makefile for Helm Operations
# This Makefile provides convenient commands for managing Helm charts

# Default namespace for Helm operations
NAMESPACE ?= test-namespace

# Helm chart paths
HELM_CHART_ROOT_PATH ?= ../../helm
HELM_CHART_PATH = $(HELM_CHART_ROOT_PATH)/lido/lido-no-widget-backend
HELM_VALUES_PATH ?=

ifneq ($(HELM_VALUES_PATH),)
	HELM_VALUES = -f $(HELM_VALUES_PATH)
else
	HELM_VALUES =
endif

# Release names
HELM_RELEASE ?= lido-no-widget-backend

# Default Helm timeout
TIMEOUT ?= 5m

# Default Helm flags
HELM_DEBUG ?= true
ifeq ($(HELM_DEBUG), true)
	HELM_DEBUG_FLAG = --debug
else
	HELM_DEBUG_FLAG =
endif

# Default values for chart versions (empty means latest)
HELM_CHART_VERSION ?=

# Version flags (only add if version is specified)
ifneq ($(HELM_CHART_VERSION),)
	HELM_VERSION_FLAG = --version $(HELM_CHART_VERSION)
else
	HELM_VERSION_FLAG =
endif

# Default ENV Variables specific to chart
API_INGRESS_HOSTNAME ?= no-widget-backend.devnet.testnet.fi
IMAGE ?= lidofinance/lido-no-widget-backend
TAG ?= dev
REGISTRY_HOSTNAME ?= docker.io
CHAIN_ID ?= 32382

# HELM overrides
# Provides a easy way to override values in helm chart by they path in YAML file
define HELM_CHART_VALUES_OVERRIDES
	--set api.image.repository="${IMAGE}" \
	--set api.image.tag="${TAG}" \
	--set api.image.registry="${REGISTRY_HOSTNAME}" \
    --set api.env.variables.PG_HOST="${PG_HOST}" \
    --set api.env.variables.NODE_ENV="${NODE_ENV}" \
    --set api.env.variables.PORT="${PORT}" \
    --set api.env.variables.CORS_WHITELIST_REGEXP="${CORS_WHITELIST_REGEXP}" \
    --set api.env.variables.GLOBAL_THROTTLE_TTL="${GLOBAL_THROTTLE_TTL}" \
    --set api.env.variables.GLOBAL_THROTTLE_LIMIT="${GLOBAL_THROTTLE_LIMIT}" \
    --set api.env.variables.GLOBAL_CACHE_TTL="${GLOBAL_CACHE_TTL}" \
    --set api.env.variables.SENTRY_DSN="${SENTRY_DSN}" \
    --set api.env.variables.LOG_LEVEL="${LOG_LEVEL}" \
    --set api.env.variables.LOG_FORMAT="${LOG_FORMAT}" \
    --set api.env.variables.KEYS_API_HOST="${KEYS_API_HOST}" \
    --set api.env.variables.EL_API_URLS="${EL_API_URLS}" \
    --set api.env.variables.CHAIN_ID="${CHAIN_ID}" \
    --set api.env.variables.DEVNET_GENESIS_FORK_VERSION="${DEVNET_GENESIS_FORK_VERSION}" \
    --set api.env.variables.LIDO_DEVNET_ADDRESS="${LIDO_DEVNET_ADDRESS}" \
    --set-json api.ingress.hosts='[{ "host": "${INGRESS_HOSTNAME}", "paths": [{ "path": "/", "pathType": "Prefix", "port": "http"}]}]' \
    --set worker.image.repository="${IMAGE}" \
	--set worker.image.tag="${TAG}" \
	--set worker.image.registry="${REGISTRY_HOSTNAME}" \
	--set worker.env.variables.PG_HOST="${PG_HOST}" \
	--set worker.env.variables.NODE_ENV="${NODE_ENV}" \
	--set worker.env.variables.PORT="${PORT}" \
	--set worker.env.variables.CORS_WHITELIST_REGEXP="${CORS_WHITELIST_REGEXP}" \
	--set worker.env.variables.GLOBAL_THROTTLE_TTL="${GLOBAL_THROTTLE_TTL}" \
	--set worker.env.variables.GLOBAL_THROTTLE_LIMIT="${GLOBAL_THROTTLE_LIMIT}" \
	--set worker.env.variables.GLOBAL_CACHE_TTL="${GLOBAL_CACHE_TTL}" \
	--set worker.env.variables.SENTRY_DSN="${SENTRY_DSN}" \
	--set worker.env.variables.LOG_LEVEL="${LOG_LEVEL}" \
	--set worker.env.variables.LOG_FORMAT="${LOG_FORMAT}" \
	--set worker.env.variables.KEYS_API_HOST="${KEYS_API_HOST}" \
	--set worker.env.variables.EL_API_URLS="${EL_API_URLS}" \
	--set worker.env.variables.CHAIN_ID="${CHAIN_ID}" \
	--set worker.env.variables.DEVNET_GENESIS_FORK_VERSION="${DEVNET_GENESIS_FORK_VERSION}" \
	--set worker.env.variables.LIDO_DEVNET_ADDRESS="${LIDO_DEVNET_ADDRESS}"
endef


# Lint Helm chart
.PHONY: debug
debug:
	echo "\n" \
	echo ${pwd} \
	echo "HELM_CHART_PATH=[$(HELM_CHART_PATH)]\n" && \
	echo "HELM_VALUES_PATH=[$(HELM_VALUES_PATH)]\n" && \
	echo "HELM_CHART_VALUES_OVERRIDES=[$(HELM_CHART_VALUES_OVERRIDES)]\n"

# Lint Helm chart
.PHONY: lint
lint:
	helm lint $(HELM_CHART_PATH) $(HELM_VALUES) $(HELM_CHART_VALUES_OVERRIDES)

# Print rendered Helm chart templates to stdout
.PHONY: template
template:
	helm template $(HELM_RELEASE) $(HELM_CHART_PATH) $(HELM_VALUES) --namespace $(NAMESPACE) \
		$(HELM_CHART_VALUES_OVERRIDES) $(HELM_DEBUG_FLAG)

# Dry-run Helm chart install into K8s
.PHONY: dry-run
dry-run:
	helm template $(HELM_RELEASE) $(HELM_CHART_PATH) $(HELM_VALUES) --namespace $(NAMESPACE) \
		$(HELM_CHART_VALUES_OVERRIDES) \
	| kubectl apply --dry-run=client -f -

# Helm chart install into K8s
.PHONY: install
install:
	helm install $(HELM_RELEASE) $(HELM_CHART_PATH) \
		$(HELM_VALUES) \
		$(HELM_CHART_VALUES_OVERRIDES) \
		--namespace $(NAMESPACE) \
		--create-namespace \
		--timeout $(TIMEOUT) \
		$(HELM_VERSION_FLAG) \
		$(HELM_DEBUG_FLAG)

# Helm chart upgrade existing installation
.PHONY: upgrade
upgrade:
	helm upgrade $(HELM_RELEASE) $(HELM_CHART_PATH) \
		$(HELM_VALUES) \
		$(HELM_CHART_VALUES_OVERRIDES) \
		--namespace $(NAMESPACE) \
		--timeout $(TIMEOUT) \
		$(HELM_VERSION_FLAG) \
		$(HELM_DEBUG_FLAG)

# Helm chart uninstall
.PHONY: uninstall
uninstall:
	helm uninstall $(HELM_RELEASE) --namespace $(NAMESPACE) --ignore-not-found
