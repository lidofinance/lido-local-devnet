# Makefile for Helm Operations

NAMESPACE ?= test-namespace

HELM_CHART_ROOT_PATH ?= ../../helm
HELM_CHART_PATH = $(HELM_CHART_ROOT_PATH)/lido/lido-onchain-mon
HELM_VALUES_PATH ?=

ifneq ($(HELM_VALUES_PATH),)
	HELM_VALUES = -f $(HELM_VALUES_PATH)
else
	HELM_VALUES =
endif

HELM_RELEASE ?= lido-onchain-mon

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

IMAGE ?= lido/onchain-mon
TAG ?= dev
REGISTRY_HOSTNAME ?= docker.io

# feeder env
FEEDER_APP_NAME ?= onchain-mon-feeder
FORWARDER_APP_NAME ?= onchain-mon-forwarder
PORT ?= 8080
LOG_FORMAT ?= simple
LOG_LEVEL ?= debug
FORWARDER_ENV ?= development

NATS_DEFAULT_URL ?= nats://nats:4222
JSON_RPC_URL ?= http://execution
BLOCK_TOPIC ?= blocks.devnet.l1
FINDINGS_TOPIC ?= findings.onchain.vroom
SOURCE ?= vroom-devnet
QUORUM_SIZE ?= 1
BLOCK_EXPLORER ?= etherscan.io

REDIS_DB ?= 0
REDIS_ADDRESS ?= $(HELM_RELEASE)-redis:6379

define HELM_CHART_VALUES_OVERRIDES
	--set image.repository="${IMAGE}" \
	--set image.tag="${TAG}" \
	--set image.registry="${REGISTRY_HOSTNAME}" \
	--set feeder.appName="${FEEDER_APP_NAME}" \
	--set feeder.port="${PORT}" \
	--set feeder.logFormat="${LOG_FORMAT}" \
	--set feeder.logLevel="${LOG_LEVEL}" \
	--set feeder.natsDefaultUrl="${NATS_DEFAULT_URL}" \
	--set feeder.jsonRpcUrl="${JSON_RPC_URL}" \
	--set feeder.blockTopic="${BLOCK_TOPIC}" \
	--set feeder.source="${SOURCE}-feeder" \
	--set feeder.redisAddress="${REDIS_ADDRESS}" \
	--set feeder.redisDb="${REDIS_DB}" \
	--set forwarder.appName="${FORWARDER_APP_NAME}" \
	--set forwarder.envName="${FORWARDER_ENV}" \
	--set forwarder.port="${PORT}" \
	--set forwarder.logFormat="${LOG_FORMAT}" \
	--set forwarder.logLevel="${LOG_LEVEL}" \
	--set forwarder.natsDefaultUrl="${NATS_DEFAULT_URL}" \
	--set forwarder.source="${SOURCE}-forwarder" \
	--set forwarder.redisAddress="${REDIS_ADDRESS}" \
	--set forwarder.redisDb="${REDIS_DB}" \
	--set forwarder.quorumSize="${QUORUM_SIZE}" \
	--set forwarder.blockExplorer="${BLOCK_EXPLORER}" \
	--set forwarder.findingsTopic="${FINDINGS_TOPIC}"
endef

.PHONY: debug
debug:
	echo "\n" \
	echo ${pwd} \
	echo "HELM_CHART_PATH=[$(HELM_CHART_PATH)]\n" && \
	echo "HELM_VALUES_PATH=[$(HELM_VALUES_PATH)]\n" && \
	echo "HELM_CHART_VALUES_OVERRIDES=[$(HELM_CHART_VALUES_OVERRIDES)]\n"

.PHONY: lint
lint:
	helm lint $(HELM_CHART_PATH) $(HELM_VALUES) $(HELM_CHART_VALUES_OVERRIDES)

.PHONY: template
template:
	helm template $(HELM_RELEASE) $(HELM_CHART_PATH) $(HELM_VALUES) --namespace $(NAMESPACE) \
		$(HELM_CHART_VALUES_OVERRIDES) $(HELM_DEBUG_FLAG)

.PHONY: dry-run
dry-run:
	helm template $(HELM_RELEASE) $(HELM_CHART_PATH) $(HELM_VALUES) --namespace $(NAMESPACE) \
		$(HELM_CHART_VALUES_OVERRIDES) \
	| kubectl apply --dry-run=client -f -

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

.PHONY: upgrade
upgrade:
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
