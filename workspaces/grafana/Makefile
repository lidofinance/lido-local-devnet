# Makefile for Helm Operations - Grafana
# This Makefile provides convenient commands for managing Grafana Helm charts

# Default namespace for Helm operations
NAMESPACE ?= test-namespace

# Helm chart paths
HELM_CHART_ROOT_PATH ?= ../../helm
HELM_CHART_PATH = $(HELM_CHART_ROOT_PATH)/vendor/grafana
HELM_VALUES_PATH ?=

ifneq ($(HELM_VALUES_PATH),)
	HELM_VALUES = -f $(HELM_VALUES_PATH)
else
	HELM_VALUES =
endif

# Release names
HELM_RELEASE ?= grafana

# Default Helm timeout
TIMEOUT ?= 5m

# Default Helm flags
HELM_DEBUG ?= true
ifeq ($(HELM_DEBUG), true)
	HELM_DEBUG_FLAG = --debug
else
	HELM_DEBUG_FLAG =
endif

# ENV Variables
INGRESS_HOSTNAME ?= grafana.devnet.local
GRAFANA_PLUGINS ?=
DATASOURCES_JSON ?= []
DASHBOARD_PROVIDERS_JSON ?= []

# Extra Helm flags for overrides from command
HELM_EXTRA_SET ?=

# HELM overrides
define HELM_CHART_VALUES_OVERRIDES
	--set ingress.host="${INGRESS_HOSTNAME}" \
	--set-string plugins="${GRAFANA_PLUGINS}" \
	--set-json 'datasources=${DATASOURCES_JSON}' \
	--set-json 'dashboardProviders=${DASHBOARD_PROVIDERS_JSON}' \
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
		$(HELM_DEBUG_FLAG)

# Helm chart upgrade existing installation
.PHONY: upgrade
upgrade:
	helm upgrade $(HELM_RELEASE) $(HELM_CHART_PATH) \
		$(HELM_VALUES) \
		$(HELM_CHART_VALUES_OVERRIDES) \
		--namespace $(NAMESPACE) \
		--timeout $(TIMEOUT) \
		$(HELM_DEBUG_FLAG)

# Helm chart uninstall
.PHONY: uninstall
uninstall:
	helm uninstall $(HELM_RELEASE) --namespace $(NAMESPACE) --ignore-not-found
