# Makefile for CLI Pod operations
# Build, push, deploy, and manage the devnet CLI pod

# ── Configuration ─────────────────────────────────────────────────

# Docker registry (uses the registry deployed in the cluster)
REGISTRY_HOSTNAME ?= container-registry.valset-02.testnet.fi
IMAGE ?= lido/devnet-cli
TAG ?= latest
FULL_IMAGE = $(REGISTRY_HOSTNAME)/$(IMAGE):$(TAG)

# Path to lido-local-devnet repo root (build context) — two levels up from workspaces/cli-pod
CLI_REPO_PATH ?= ../..

# Kubernetes
NAMESPACE ?= default
DEPLOYMENT_NAME ?= cli-pod

# GitHub token (for creating secrets)
GITHUB_TOKEN ?=
REGISTRY_USERNAME ?=
REGISTRY_PASSWORD ?=

# ── Docker targets ────────────────────────────────────────────────

# Build CLI pod Docker image (always amd64 — runs on Linux VMs)
.PHONY: build
build:
	@echo "🏗️  Building $(FULL_IMAGE) for linux/amd64"
	docker build --platform linux/amd64 -f Dockerfile -t $(FULL_IMAGE) $(CLI_REPO_PATH)

# Push image to registry
.PHONY: push
push:
	@echo "📦 Pushing $(FULL_IMAGE)"
	docker push $(FULL_IMAGE)

# Build and push in one step
.PHONY: build-push
build-push: build push

# Login to registry
.PHONY: login
login:
	docker login $(REGISTRY_HOSTNAME)

# ── Kubernetes targets ────────────────────────────────────────────

# Create required secrets
.PHONY: create-secrets
create-secrets:
	@if [ -z "$(GITHUB_TOKEN)" ]; then echo "❌ GITHUB_TOKEN is required"; exit 1; fi
	kubectl create secret generic cli-pod-secrets \
		--namespace $(NAMESPACE) \
		--from-literal=github-token=$(GITHUB_TOKEN) \
		$(if $(REGISTRY_USERNAME),--from-literal=registry-username=$(REGISTRY_USERNAME)) \
		$(if $(REGISTRY_PASSWORD),--from-literal=registry-password=$(REGISTRY_PASSWORD)) \
		--dry-run=client -o yaml | kubectl apply -f -
	kubectl create secret generic cli-pod-kubeconfig \
		--namespace $(NAMESPACE) \
		--from-file=config=$(HOME)/.kube/config \
		--dry-run=client -o yaml | kubectl apply -f -


# Deploy to cluster
.PHONY: deploy
deploy:
	@echo "🚀 Deploying cli-pod to namespace $(NAMESPACE)"
	kubectl apply -f k8s-deployment.yaml --namespace $(NAMESPACE)

# Full setup: build, push, create secrets, deploy
.PHONY: setup
setup: build-push create-secrets deploy
	@echo "✅ CLI pod setup complete"
	@echo "   Verify: make verify"

# Restart pod (pull new image)
.PHONY: restart
restart:
	@echo "🔄 Restarting cli-pod"
	kubectl rollout restart deployment $(DEPLOYMENT_NAME) --namespace $(NAMESPACE)

# Update: rebuild image and restart pod
.PHONY: update
update: build-push restart
	@echo "✅ CLI pod updated"

# Remove from cluster
.PHONY: teardown
teardown:
	kubectl delete -f k8s-deployment.yaml --namespace $(NAMESPACE) --ignore-not-found
	kubectl delete secret cli-pod-secrets --namespace $(NAMESPACE) --ignore-not-found
	kubectl delete secret cli-pod-kubeconfig --namespace $(NAMESPACE) --ignore-not-found

# ── Status & Debug ────────────────────────────────────────────────

# Check pod status
.PHONY: status
status:
	kubectl get pods -l app=cli-pod --namespace $(NAMESPACE)

# Verify CLI pod is working
.PHONY: verify
verify:
	@echo "🔍 Checking cli-pod..."
	@kubectl exec deployment/$(DEPLOYMENT_NAME) --namespace $(NAMESPACE) -- ./bin/run.js --version && echo "✅ CLI: OK" || echo "❌ CLI: FAIL"
	@kubectl exec deployment/$(DEPLOYMENT_NAME) --namespace $(NAMESPACE) -- kubectl get nodes && echo "✅ kubectl: OK" || echo "❌ kubectl: FAIL"
	@kubectl exec deployment/$(DEPLOYMENT_NAME) --namespace $(NAMESPACE) -- docker info > /dev/null 2>&1 && echo "✅ Docker: OK" || echo "❌ Docker: FAIL"
	@kubectl exec deployment/$(DEPLOYMENT_NAME) --namespace $(NAMESPACE) -- git --version && echo "✅ Git: OK" || echo "❌ Git: FAIL"

# Open interactive shell in cli-pod
.PHONY: shell
shell:
	kubectl exec -it deployment/$(DEPLOYMENT_NAME) --namespace $(NAMESPACE) -- bash

# View pod logs
.PHONY: logs
logs:
	kubectl logs deployment/$(DEPLOYMENT_NAME) --namespace $(NAMESPACE) --tail=100 -f

# ── Help ──────────────────────────────────────────────────────────

.PHONY: help
help:
	@echo "CLI Pod Management"
	@echo ""
	@echo "  First time setup:"
	@echo "    make setup GITHUB_TOKEN=ghp_xxx"
	@echo ""
	@echo "  After CLI update:"
	@echo "    make update"
	@echo ""
	@echo "  Daily use:"
	@echo "    make status          — check pod status"
	@echo "    make shell           — open shell in pod"
	@echo "    make logs            — view pod logs"
	@echo "    make verify          — check all tools work"
	@echo ""
	@echo "  Docker:"
	@echo "    make build           — build Docker image"
	@echo "    make push            — push to registry"
	@echo "    make build-push      — build + push"
	@echo ""
	@echo "  Kubernetes:"
	@echo "    make deploy          — apply k8s manifests"
	@echo "    make restart         — restart pod (pull new image)"
	@echo "    make create-secrets  — create k8s secrets (kubeconfig + github-token)"
	@echo "    make teardown        — remove everything"
	@echo ""
	@echo "  Config (env vars):"
	@echo "    REGISTRY_HOSTNAME    — registry (default: container-registry.valset-02.testnet.fi)"
	@echo "    CLI_REPO_PATH        — path to lido-local-devnet (default: ../..)"
	@echo "    NAMESPACE            — k8s namespace (default: default)"
	@echo "    GITHUB_TOKEN         — for create-secrets target"
