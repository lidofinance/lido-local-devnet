# Makefile for Helm Operations

NAMESPACE ?= test-namespace

HELM_CHART_ROOT_PATH ?= ../../helm
HELM_CHART_PATH = $(HELM_CHART_ROOT_PATH)/lido/lido-vroom-onchain-mon
HELM_VALUES_PATH ?=

ifneq ($(HELM_VALUES_PATH),)
	HELM_VALUES = -f $(HELM_VALUES_PATH)
else
	HELM_VALUES =
endif

HELM_RELEASE ?= lido-vroom-onchain-mon

TIMEOUT ?= 5m

HELM_DEBUG ?= true
ifeq ($(HELM_DEBUG), true)
	HELM_DEBUG_FLAG = --debug
else
	HELM_DEBUG_FLAG =
endif

HELM_CHART_VERSION ?=
ifneq ($(HELM_CHART_VERSION),)
	HELM_VERSION_FLAG = --version $(HELM_CHART_VERSION)
else
	HELM_VERSION_FLAG =
endif

IMAGE ?= lido/vroom-onchain-mon
TAG ?= dev
REGISTRY_HOSTNAME ?= docker.io

define HELM_CHART_VALUES_OVERRIDES
	--set lido-app.image.repository="${IMAGE}" \
	--set lido-app.image.tag="${TAG}" \
	--set lido-app.image.registry="${REGISTRY_HOSTNAME}" \
	--set lido-app.env.variables.APP_NAME="${APP_NAME}" \
	--set lido-app.env.variables.TEAM_NAME="${TEAM_NAME}" \
	--set lido-app.env.variables.PORT="${PORT}" \
	--set lido-app.env.variables.LOG_LEVEL="${LOG_LEVEL}" \
	--set lido-app.env.variables.LOG_FORMAT="${LOG_FORMAT}" \
	--set lido-app.env.variables.EL_API_URLS="${EL_API_URLS}" \
	--set lido-app.env.variables.CHAIN_ID="${CHAIN_ID}" \
	--set lido-app.env.variables.CONTRACT_ADDRESSES_NETWORK="${CONTRACT_ADDRESSES_NETWORK}" \
	--set lido-app.env.variables.KEYS_API_URL="${KEYS_API_URL}" \
	--set lido-app.env.variables.NATS_SERVERS="${NATS_SERVERS}" \
	--set lido-app.env.variables.NATS_LISTEN_TOPIC="${NATS_LISTEN_TOPIC}" \
	--set lido-app.env.variables.NATS_PUBLISH_TOPIC="${NATS_PUBLISH_TOPIC}" \
	--set lido-app.env.variables.ENABLED_AGENTS="${ENABLED_AGENTS}" \
	--set lido-app.env.variables.CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID="${CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID}" \
	--set lido-app.env.variables.SIMPLE_DVT_NODE_OPERATOR_REGISTRY_MODULE_ID="${SIMPLE_DVT_NODE_OPERATOR_REGISTRY_MODULE_ID}" \
	--set lido-app.env.variables.CSM_NODE_OPERATOR_REGISTRY_MODULE_ID="${CSM_NODE_OPERATOR_REGISTRY_MODULE_ID}"
endef

.PHONY: debug
debug:
	echo "\n" \
	echo ${pwd} \
	echo "HELM_CHART_PATH=[$(HELM_CHART_PATH)]\n" && \
	echo "HELM_VALUES_PATH=[$(HELM_VALUES_PATH)]\n" && \
	echo "HELM_CHART_VALUES_OVERRIDES=[$(HELM_CHART_VALUES_OVERRIDES)]\n"

.PHONY: deps
deps:
	helm dependency build $(HELM_CHART_PATH)

.PHONY: lint
lint:
	$(MAKE) deps
	helm lint $(HELM_CHART_PATH) $(HELM_VALUES) $(HELM_CHART_VALUES_OVERRIDES)

.PHONY: template
template:
	$(MAKE) deps
	helm template $(HELM_RELEASE) $(HELM_CHART_PATH) $(HELM_VALUES) --namespace $(NAMESPACE) \
		$(HELM_CHART_VALUES_OVERRIDES) $(HELM_DEBUG_FLAG)

.PHONY: dry-run
dry-run:
	$(MAKE) deps
	helm template $(HELM_RELEASE) $(HELM_CHART_PATH) $(HELM_VALUES) --namespace $(NAMESPACE) \
		$(HELM_CHART_VALUES_OVERRIDES) \
	| kubectl apply --dry-run=client -f -

.PHONY: install
install:
	$(MAKE) deps
	helm install $(HELM_RELEASE) $(HELM_CHART_PATH) \
		$(HELM_VALUES) \
		$(HELM_CHART_VALUES_OVERRIDES) \
		--namespace $(NAMESPACE) \
		--create-namespace \
		--timeout $(TIMEOUT) \
		$(HELM_VERSION_FLAG) \
		$(HELM_DEBUG_FLAG)

.PHONY: upgrade
upgrade:
	$(MAKE) deps
	helm upgrade $(HELM_RELEASE) $(HELM_CHART_PATH) \
		$(HELM_VALUES) \
		$(HELM_CHART_VALUES_OVERRIDES) \
		--namespace $(NAMESPACE) \
		--timeout $(TIMEOUT) \
		$(HELM_VERSION_FLAG) \
		$(HELM_DEBUG_FLAG)

.PHONY: uninstall
uninstall:
	helm uninstall $(HELM_RELEASE) --namespace $(NAMESPACE) --ignore-not-found
