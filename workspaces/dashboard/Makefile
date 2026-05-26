# Makefile for Dashboard Helm Operations

NAMESPACE ?= test-namespace
HELM_CHART_ROOT_PATH ?= ../../helm
HELM_CHART_PATH = $(HELM_CHART_ROOT_PATH)/lido/lido-dashboard
HELM_VALUES_PATH ?=

ifneq ($(HELM_VALUES_PATH),)
	HELM_VALUES = -f $(HELM_VALUES_PATH)
else
	HELM_VALUES =
endif

HELM_RELEASE ?= lido-dashboard
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

INGRESS_HOSTNAME ?= dashboard.devnet.local
IMAGE ?= lido/dashboard
TAG ?= dev
REGISTRY_HOSTNAME ?= docker.io

define HELM_CHART_VALUES_OVERRIDES
	--set web.image.repository="${IMAGE}" \
	--set web.image.tag="${TAG}" \
	--set web.image.registry="${REGISTRY_HOSTNAME}" \
    --set-json web.ingress.hosts='[{ "host": "${INGRESS_HOSTNAME}", "paths": [{ "path": "/", "pathType": "Prefix", "port": "http"}]}]' \

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
