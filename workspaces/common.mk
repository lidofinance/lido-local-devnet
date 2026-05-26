# Common deploy metadata for all services
# Include this in service Makefiles: include ../common.mk
# Then add $(DEPLOY_META_OVERRIDES) to HELM_CHART_VALUES_OVERRIDES

DEPLOY_COMMIT ?=
DEPLOY_TIME ?=

define DEPLOY_META_OVERRIDES
$(if $(DEPLOY_COMMIT),--set lido-app.deployMeta.commit="${DEPLOY_COMMIT}") \
$(if $(DEPLOY_TIME),--set lido-app.deployMeta.deployedAt="${DEPLOY_TIME}")
endef
