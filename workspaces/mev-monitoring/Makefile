# Makefile for Helm Operations - MEV Monitoring
# This Makefile provides convenient commands for managing Helm charts

# Default namespace for Helm operations
NAMESPACE ?= test-namespace

# Helm chart paths
HELM_CHART_ROOT_PATH ?= ../../helm
HELM_CHART_PATH = $(HELM_CHART_ROOT_PATH)/lido/lido-mev-monitoring
HELM_VENDOR_CHART_PATH = $(HELM_CHART_ROOT_PATH)/vendor
HELM_VALUES_PATH ?=

ifneq ($(HELM_VALUES_PATH),)
	HELM_VALUES = -f $(HELM_VALUES_PATH)
else
	HELM_VALUES =
endif

# Release names
HELM_RELEASE ?= mev-monitoring
POSTGRESQL_RELEASE ?= mev-mon-postgresql
REDIS_RELEASE ?= mev-mon-redis

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
IMAGE ?= lido/mev-monitoring
TAG ?= dev
REGISTRY_HOSTNAME ?= docker.io
EL_RPC_URLS ?= http://execution
CL_API_URLS ?= http://consensus
KEYS_API_URL ?= http://kapi:3600
CHAIN_ID ?= 32382

# Database
DB_HOST ?= mev-mon-postgresql-postgresql
DB_PORT ?= 5432
DB_NAME ?= mev_monitoring
DB_USER ?= mev_user
DB_PASSWORD ?= mev_password
DB_MAX_POOL_SIZE ?= 25

# Redis
REDIS_HOST ?= mev-mon-redis-redis-master
REDIS_PORT ?= 6379

# App
PORT ?= 3000
NODE_ENV ?= production
LOG_LEVEL ?= debug
LOG_FORMAT ?= json
BEACON_START_SLOT ?= 0

# Relay endpoints (JSON arrays)
RELAY_ENDPOINTS ?= []
MEV_BOOST_RELAYS ?= []

# HELM overrides
define HELM_CHART_VALUES_OVERRIDES
	--set lido-app.image.repository="${IMAGE}" \
	--set lido-app.image.tag="${TAG}" \
	--set lido-app.image.registry="${REGISTRY_HOSTNAME}" \
	--set lido-app.env.variables.EL_RPC_URLS="${EL_RPC_URLS}" \
	--set lido-app.env.variables.CL_API_URLS="${CL_API_URLS}" \
	--set lido-app.env.variables.KEYS_API_URL="${KEYS_API_URL}" \
	--set lido-app.env.variables.CHAIN_ID="${CHAIN_ID}" \
	--set lido-app.env.variables.DB_HOST="${DB_HOST}" \
	--set lido-app.env.variables.DB_PORT="${DB_PORT}" \
	--set lido-app.env.variables.DB_NAME="${DB_NAME}" \
	--set lido-app.env.variables.DB_USER="${DB_USER}" \
	--set lido-app.env.variables.DB_PASSWORD="${DB_PASSWORD}" \
	--set lido-app.env.variables.DB_MAX_POOL_SIZE="${DB_MAX_POOL_SIZE}" \
	--set lido-app.env.variables.REDIS_HOST="${REDIS_HOST}" \
	--set lido-app.env.variables.REDIS_PORT="${REDIS_PORT}" \
	--set lido-app.env.variables.PORT="${PORT}" \
	--set lido-app.env.variables.NODE_ENV="${NODE_ENV}" \
	--set lido-app.env.variables.LOG_LEVEL="${LOG_LEVEL}" \
	--set lido-app.env.variables.LOG_FORMAT="${LOG_FORMAT}" \
	--set lido-app.env.variables.BEACON_START_SLOT="${BEACON_START_SLOT}" \
	--set-json 'lido-app.env.variables.RELAY_ENDPOINTS=${RELAY_ENDPOINTS}' \
	--set-json 'lido-app.env.variables.MEV_BOOST_RELAYS=${MEV_BOOST_RELAYS}'
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

# ── Infrastructure targets ─────────────────────────────────────────

# Install PostgreSQL
.PHONY: install-postgres
install-postgres:
	helm upgrade --install $(POSTGRESQL_RELEASE) $(HELM_VENDOR_CHART_PATH)/postgresql \
		--namespace $(NAMESPACE) \
		--create-namespace \
		--timeout $(TIMEOUT) \
		--set auth.username=$(DB_USER) \
		--set auth.password=$(DB_PASSWORD) \
		--set auth.database=$(DB_NAME) \
		--set primary.persistence.size=10Gi

# Uninstall PostgreSQL
.PHONY: uninstall-postgres
uninstall-postgres:
	helm uninstall $(POSTGRESQL_RELEASE) --namespace $(NAMESPACE) --ignore-not-found

# Install Redis
.PHONY: install-redis
install-redis:
	helm upgrade --install $(REDIS_RELEASE) oci://registry-1.docker.io/bitnamicharts/redis \
		--namespace $(NAMESPACE) \
		--create-namespace \
		--timeout $(TIMEOUT) \
		--set auth.enabled=false \
		--set architecture=standalone \
		--set master.persistence.size=1Gi

# Uninstall Redis
.PHONY: uninstall-redis
uninstall-redis:
	helm uninstall $(REDIS_RELEASE) --namespace $(NAMESPACE) --ignore-not-found
