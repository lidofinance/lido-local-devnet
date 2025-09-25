# Makefile for Helm Operations
# This Makefile provides convenient commands for managing Helm charts

# Default namespace for Helm operations
NAMESPACE ?= test-namespace

# Helm chart paths
HELM_CHART_ROOT_PATH ?= ../../helm
HELM_CHART_PATH = $(HELM_CHART_ROOT_PATH)/lido/lido-oracle
HELM_VALUES_PATH ?=

ifneq ($(HELM_VALUES_PATH),)
	HELM_VALUES = -f $(HELM_VALUES_PATH)
else
	HELM_VALUES =
endif

# Release names
HELM_RELEASE ?= oracle-accounting-1

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
IMAGE ?= lidofinance/oracle
TAG ?= dev
REGISTRY_HOSTNAME ?= docker.io
PROVIDERS_URLS ?= http://execution
CL_API_URLS ?= http://consensus
CHAIN_ID ?= 32382

# HELM overrides
# Provides a easy way to override values in helm chart by they path in YAML file
define HELM_CHART_VALUES_OVERRIDES
	--set lido-app.image.repository="${IMAGE}" \
	--set lido-app.image.tag="${TAG}" \
	--set lido-app.image.registry="${REGISTRY_HOSTNAME}" \
	--set "lido-app.args={${COMMAND}}" \
	--set lido-app.env.variables.EXECUTION_CLIENT_URI="${EXECUTION_CLIENT_URI}" \
	--set lido-app.env.variables.CONSENSUS_CLIENT_URI="${CONSENSUS_CLIENT_URI}" \
	--set lido-app.env.variables.KEYS_API_URI="${KEYS_API_URI}" \
	--set lido-app.env.variables.MEMBER_PRIV_KEY="${MEMBER_PRIV_KEY}" \
	--set lido-app.env.variables.LIDO_LOCATOR_ADDRESS="${LIDO_LOCATOR_ADDRESS}" \
	--set lido-app.env.variables.CSM_MODULE_ADDRESS="${CSM_MODULE_ADDRESS}" \
	--set lido-app.env.variables.CSM_ORACLE_MAX_CONCURRENCY="${CSM_ORACLE_MAX_CONCURRENCY}" \
	--set lido-app.env.variables.SUBMIT_DATA_DELAY_IN_SLOTS="${SUBMIT_DATA_DELAY_IN_SLOTS}" \
	--set lido-app.env.variables.ALLOW_REPORTING_IN_BUNKER_MODE="${ALLOW_REPORTING_IN_BUNKER_MODE}" \
	--set lido-app.env.variables.PINATA_JWT="${PINATA_JWT}" \
	--set lido-app.env.variables.KUBO_HOST="${KUBO_HOST}"
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
