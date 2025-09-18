# Makefile for Helm Operations
# This Makefile provides convenient commands for managing Helm charts

# Default namespace for Helm operations
NAMESPACE ?= test-namespace

# Helm chart paths
HELM_CHART_ROOT_PATH ?= ../../helm
HELM_CHART_PATH = $(HELM_CHART_ROOT_PATH)/lido/lido-dsm-bot
HELM_VALUES_PATH ?=

ifneq ($(HELM_VALUES_PATH),)
	HELM_VALUES = -f $(HELM_VALUES_PATH)
else
	HELM_VALUES =
endif

# Release names
HELM_RELEASE ?= dsm-bot

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
IMAGE ?= lidofinance/depositor-bot
TAG ?= dev
REGISTRY_HOSTNAME ?= docker.io
WEB3_RPC_ENDPOINTS ?= http://execution

# HELM overrides
# Provides a easy way to override values in helm chart by they path in YAML file
define HELM_CHART_VALUES_OVERRIDES
	--set lido-app.image.repository="${IMAGE}" \
	--set lido-app.image.tag="${TAG}" \
	--set lido-app.image.registry="${REGISTRY_HOSTNAME}" \
	--set "lido-app.args={${COMMAND}}" \
	--set lido-app.env.variables.WEB3_RPC_ENDPOINTS="${WEB3_RPC_ENDPOINTS}" \
    --set lido-app.env.variables.WALLET_PRIVATE_KEY="${WALLET_PRIVATE_KEY}" \
    --set lido-app.env.variables.LIDO_LOCATOR="${LIDO_LOCATOR}" \
    --set lido-app.env.variables.DEPOSIT_CONTRACT="${DEPOSIT_CONTRACT}" \
    --set lido-app.env.variables.MESSAGE_TRANSPORTS="${MESSAGE_TRANSPORTS}" \
    --set lido-app.env.variables.ONCHAIN_TRANSPORT_ADDRESS="${ONCHAIN_TRANSPORT_ADDRESS}" \
    --set lido-app.env.variables.ONCHAIN_TRANSPORT_RPC_ENDPOINTS="${ONCHAIN_TRANSPORT_RPC_ENDPOINTS}" \
    --set lido-app.env.variables.RABBIT_MQ_URL="${RABBIT_MQ_URL}" \
    --set lido-app.env.variables.RABBIT_MQ_USERNAME="${RABBIT_MQ_USERNAME}" \
    --set lido-app.env.variables.RABBIT_MQ_PASSWORD="${RABBIT_MQ_PASSWORD}" \
    --set lido-app.env.variables.CREATE_TRANSACTIONS="${CREATE_TRANSACTIONS}" \
    --set lido-app.env.variables.DEPOSIT_MODULES_WHITELIST="${DEPOSIT_MODULES_WHITELIST}" \
    --set lido-app.env.variables.PROMETHEUS_PREFIX="${PROMETHEUS_PREFIX}"
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
	helm template $(HELM_RELEASE) $(HELM_CHART_PATH) (HELM_VALUES) --namespace $(NAMESPACE) \
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
