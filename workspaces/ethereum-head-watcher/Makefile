# Makefile for Helm Operations - Ethereum Head Watcher

NAMESPACE ?= test-namespace

HELM_CHART_ROOT_PATH ?= ../../helm
HELM_CHART_PATH = $(HELM_CHART_ROOT_PATH)/lido/lido-ethereum-head-watcher
HELM_VALUES_PATH ?=

ifneq ($(HELM_VALUES_PATH),)
	HELM_VALUES = -f $(HELM_VALUES_PATH)
else
	HELM_VALUES =
endif

HELM_RELEASE ?= lido-ethereum-head-watcher

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

IMAGE ?= lido/ethereum-head-watcher
TAG ?= dev
REGISTRY_HOSTNAME ?= docker.io

define HELM_CHART_VALUES_OVERRIDES
	--set lido-app.image.repository="${IMAGE}" \
	--set lido-app.image.tag="${TAG}" \
	--set lido-app.image.registry="${REGISTRY_HOSTNAME}"
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

.PHONY: deps
deps:
	helm dependency build $(HELM_CHART_PATH)

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
