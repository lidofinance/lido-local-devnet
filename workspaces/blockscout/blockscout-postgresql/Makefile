# Makefile for Home Infrastructure Helm Operations
# This Makefile provides convenient commands for managing Helm charts in the home infrastructure

# Default namespace for Helm operations
NAMESPACE ?= blockscout

# Helm chart paths
HELM_CHART_PATH = ../../../helm/vendor/postgresql
HELM_VALUES_PATH = ./values.yaml

# Release names
HELM_RELEASE = postgresql

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
ifneq ($(HELM_VERSION),)
  HELM_VERSION_FLAG = --version $(HELM_VERSION)
else
  HELM_VERSION_FLAG =
endif

# Helm operations
.PHONY: lint
lint:
	helm lint $(HELM_CHART_PATH) -f $(HELM_VALUES_PATH)

.PHONY: template
template:
	helm template $(HELM_RELEASE) $(HELM_CHART_PATH) -f $(HELM_VALUES_PATH) --namespace $(NAMESPACE)

.PHONY: dry-run
dry-run:
	helm template $(HELM_RELEASE) $(HELM_CHART_PATH) -f $(HELM_VALUES_PATH) --namespace $(NAMESPACE) \
	| kubectl apply --dry-run=client -f -

.PHONY: install
install:
	helm install $(HELM_RELEASE) $(HELM_CHART_PATH) \
		-f $(HELM_VALUES_PATH) \
		--namespace $(NAMESPACE) \
		--create-namespace \
		--timeout $(TIMEOUT) \
		$(HELM_VERSION_FLAG) \
		$(HELM_DEBUG_FLAG)

.PHONY: upgrade
upgrade:
	helm upgrade $(HELM_RELEASE) $(HELM_CHART_PATH) \
		-f $(HELM_VALUES_PATH) \
		--namespace $(NAMESPACE) \
		--timeout $(TIMEOUT) \
		$(HELM_VERSION_FLAG) \
		$(HELM_DEBUG_FLAG)

.PHONY: uninstall
uninstall:
	helm uninstall $(HELM_RELEASE) --namespace $(NAMESPACE)
