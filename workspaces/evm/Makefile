# Makefile for Helm Operations - Ethereum Validators Monitoring
# This Makefile provides convenient commands for managing Helm charts

# Default namespace for Helm operations
NAMESPACE ?= test-namespace

# Helm chart paths
HELM_CHART_ROOT_PATH ?= ../../helm
HELM_CHART_PATH = $(HELM_CHART_ROOT_PATH)/lido/lido-evm
HELM_VALUES_PATH ?=

ifneq ($(HELM_VALUES_PATH),)
	HELM_VALUES = -f $(HELM_VALUES_PATH)
else
	HELM_VALUES =
endif

# Release names
HELM_RELEASE ?= lido-evm

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
IMAGE ?= lido/ethereum-validators-monitoring
TAG ?= dev
REGISTRY_HOSTNAME ?= docker.io
EL_RPC_URLS ?= http://execution
CL_API_URLS ?= http://consensus
VALIDATOR_REGISTRY_KEYSAPI_SOURCE_URLS ?= http://kapi:3000/v1
INGRESS_HOSTNAME ?= evm.devnet.testnet.fi
DB_HOST ?= http://evm-clickhouse
CHAIN_ID ?= 32382

# Extra Helm flags for overrides from command
HELM_EXTRA_SET ?=

# HELM overrides
define HELM_CHART_VALUES_OVERRIDES
	--set lido-app.image.repository="${IMAGE}" \
	--set lido-app.image.tag="${TAG}" \
	--set lido-app.image.registry="${REGISTRY_HOSTNAME}" \
	--set lido-app.env.variables.EL_RPC_URLS="${EL_RPC_URLS}" \
	--set lido-app.env.variables.CL_API_URLS="${CL_API_URLS}" \
	--set lido-app.env.variables.ETH_NETWORK="${CHAIN_ID}" \
	--set lido-app.env.variables.VALIDATOR_REGISTRY_KEYSAPI_SOURCE_URLS="${VALIDATOR_REGISTRY_KEYSAPI_SOURCE_URLS}" \
	--set lido-app.env.variables.DB_HOST="${DB_HOST}" \
	--set lido-app.env.variables.DB_PORT="${DB_PORT}" \
	--set lido-app.env.variables.DB_USER="${DB_USER}" \
	--set lido-app.env.variables.DB_PASSWORD="${DB_PASSWORD}" \
	--set lido-app.env.variables.DB_NAME="${DB_NAME}" \
	--set lido-app.env.variables.START_EPOCH="${START_EPOCH}" \
	--set lido-app.env.variables.FETCH_INTERVAL_SLOTS="${FETCH_INTERVAL_SLOTS}" \
	--set lido-app.env.variables.CHAIN_SLOT_TIME_SECONDS="${CHAIN_SLOT_TIME_SECONDS}" \
	--set lido-app.env.variables.LOG_LEVEL="${LOG_LEVEL}" \
	--set lido-app.env.variables.LOG_FORMAT="${LOG_FORMAT}" \
	--set-json lido-app.ingress.hosts='[{ "host": "${INGRESS_HOSTNAME}", "paths": [{ "path": "/", "pathType": "Prefix", "port": "http"}]}]' \
	${HELM_EXTRA_SET}
endef

# Debug: print variables
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
