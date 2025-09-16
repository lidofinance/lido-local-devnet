# Makefile for Helm Operations
# This Makefile provides convenient commands for managing Helm charts

# Default namespace for Helm operations
NAMESPACE ?= test-namespace

# Helm chart paths
HELM_CHART_ROOT_PATH ?= ../../../helm
HELM_CHART_PATH = $(HELM_CHART_ROOT_PATH)/vendor/blockscout-stack
HELM_VALUES_PATH = ./values.yaml

# Release names
HELM_RELEASE = blockscout-stack

# Default Helm timeout
TIMEOUT ?= 5m

# Default Helm flags
HELM_DEBUG ?= false
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
BLOCKSCOUT_ETHEREUM_JSONRPC_VARIANT ?= geth
BLOCKSCOUT_ETHEREUM_JSONRPC_WS_URL ?= http://execution:8546
BLOCKSCOUT_ETHEREUM_JSONRPC_TRACE_URL ?= http://execution:8545
BLOCKSCOUT_ETHEREUM_JSONRPC_HTTP_URL ?= http://execution:8545
BLOCKSCOUT_BACKEND_INGRESS_HOSTNAME ?= blockscout-backend.devnet.valset-02.testnet.fi
BLOCKSCOUT_FRONTEND_INGRESS_HOSTNAME ?= blockscout.devnet.valset-02.testnet.fi

# HELM overrides
# Provides a easy way to override values in helm chart by they path in YAML file
define HELM_CHART_VALUES_OVERRIDES
	--set blockscout.env.ETHEREUM_JSONRPC_VARIANT=$(BLOCKSCOUT_ETHEREUM_JSONRPC_VARIANT) \
	--set blockscout.env.ETHEREUM_JSONRPC_WS_URL=$(BLOCKSCOUT_ETHEREUM_JSONRPC_WS_URL) \
	--set blockscout.env.ETHEREUM_JSONRPC_TRACE_URL=$(BLOCKSCOUT_ETHEREUM_JSONRPC_TRACE_URL) \
	--set blockscout.env.ETHEREUM_JSONRPC_HTTP_URL=$(BLOCKSCOUT_ETHEREUM_JSONRPC_HTTP_URL) \
	--set blockscout.ingress.hostname=$(BLOCKSCOUT_BACKEND_INGRESS_HOSTNAME) \
	--set frontend.ingress.hostname=$(BLOCKSCOUT_FRONTEND_INGRESS_HOSTNAME)
endef

# Lint Helm chart
.PHONY: debug
debug:
	echo "\n" \
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
		$(HELM_CHART_VALUES_OVERRIDES)

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
