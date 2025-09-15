# Makefile for Helm Operations
# This Makefile provides convenient commands for managing Helm charts

# Default namespace for Helm operations
NAMESPACE ?= kt-my-devnet-kapi

# Helm chart paths
HELM_CHART_ROOT_PATH ?= ../../helm
HELM_CHART_PATH = $(HELM_CHART_ROOT_PATH)/lido/lido-kapi
HELM_VALUES_PATH = ./values.yaml

# Release names
HELM_RELEASE = lido-kapi

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
KAPI_INGRESS_HOSTNAME ?= kapi.devnet.testnet.fi
IMAGE ?= lidofinance/lido-keys-api
TAG ?= dev
REGISTRY_HOSTNAME ?= docker.io
PROVIDERS_URLS ?= http://execution
CL_API_URLS ?= http://consensus
CHAIN_ID ?= 32382

# HELM overrides
# Provides a easy way to override values in helm chart by they path in YAML file
define HELM_CHART_VALUES_OVERRIDES
	--set lido-backend.image.repository="${IMAGE}" \
	--set lido-backend.image.tag="${TAG}" \
	--set lido-backend.image.registry="${REGISTRY_HOSTNAME}" \
	--set lido-backend.env.variables.CORS_WHITELIST_REGEXP="${CORS_WHITELIST_REGEXP}" \
	--set lido-backend.env.variables.GLOBAL_THROTTLE_TTL="${GLOBAL_THROTTLE_TTL}" \
	--set lido-backend.env.variables.GLOBAL_THROTTLE_LIMIT="${GLOBAL_THROTTLE_LIMIT}" \
	--set lido-backend.env.variables.GLOBAL_CACHE_TTL="${GLOBAL_CACHE_TTL}" \
	--set lido-backend.env.variables.PROVIDERS_URLS="${PROVIDERS_URLS}" \
	--set lido-backend.env.variables.CL_API_URLS="${CL_API_URLS}" \
	--set lido-backend.env.variables.IS_DEVNET_MODE="${IS_DEVNET_MODE}" \
	--set lido-backend.env.variables.CHAIN_ID="${CHAIN_ID}" \
	--set lido-backend.env.variables.JOB_INTERVAL_REGISTRY="${JOB_INTERVAL_REGISTRY}" \
	--set lido-backend.env.variables.VALIDATOR_REGISTRY_ENABLE="${VALIDATOR_REGISTRY_ENABLE}" \
	--set lido-backend.env.variables.JOB_INTERVAL_VALIDATORS_REGISTRY="${JOB_INTERVAL_VALIDATORS_REGISTRY}" \
	--set lido-backend.env.variables.LIDO_LOCATOR_DEVNET_ADDRESS="${LIDO_LOCATOR_DEVNET_ADDRESS}" \
	--set lido-backend.env.variables.CURATED_MODULE_DEVNET_ADDRESS="${CURATED_MODULE_DEVNET_ADDRESS}" \
	--set lido-backend.env.variables.CSM_MODULE_DEVNET_ADDRESS="${CSM_MODULE_DEVNET_ADDRESS}" \
	--set lido-backend.env.variables.STAKING_ROUTER_DEVNET_ADDRESS="${STAKING_ROUTER_DEVNET_ADDRESS}" \
	--set lido-backend.ingress.hosts[0].host="${KAPI_INGRESS_HOSTNAME}"
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
	helm lint $(HELM_CHART_PATH) -f $(HELM_VALUES_PATH) $(HELM_CHART_VALUES_OVERRIDES)

# Print rendered Helm chart templates to stdout
.PHONY: template
template:
	helm template $(HELM_RELEASE) $(HELM_CHART_PATH) -f $(HELM_VALUES_PATH) --namespace $(NAMESPACE) \
		$(HELM_CHART_VALUES_OVERRIDES) $(HELM_DEBUG_FLAG)

# Dry-run Helm chart install into K8s
.PHONY: dry-run
dry-run:
	helm template $(HELM_RELEASE) $(HELM_CHART_PATH) -f $(HELM_VALUES_PATH) --namespace $(NAMESPACE) \
		$(HELM_CHART_VALUES_OVERRIDES) \
	| kubectl apply --dry-run=client -f -

# Helm chart install into K8s
.PHONY: install
install:
	helm install $(HELM_RELEASE) $(HELM_CHART_PATH) \
		-f $(HELM_VALUES_PATH) \
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
		-f $(HELM_VALUES_PATH) \
		$(HELM_CHART_VALUES_OVERRIDES) \
		--namespace $(NAMESPACE) \
		--timeout $(TIMEOUT) \
		$(HELM_VERSION_FLAG) \
		$(HELM_DEBUG_FLAG)

# Helm chart uninstall
.PHONY: uninstall
uninstall:
	helm uninstall $(HELM_RELEASE) --namespace $(NAMESPACE) --ignore-not-found
