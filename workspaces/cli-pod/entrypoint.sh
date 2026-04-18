#!/bin/bash
set -e

# Read a specific env var from /app/.env (we avoid `source` because the file
# contains dotenv-expand patterns like $(DEVNET_NAME) that break in bash).
read_env_var() {
    local name="$1"
    if [ -f /app/.env ]; then
        local line
        line=$(grep -E "^${name}=" /app/.env | tail -n 1 || true)
        if [ -n "${line}" ]; then
            echo "${line#*=}"
        fi
    fi
}

if [ -z "${K8S_KUBECTL_DEFAULT_CONTEXT:-}" ]; then
    export K8S_KUBECTL_DEFAULT_CONTEXT="$(read_env_var K8S_KUBECTL_DEFAULT_CONTEXT)"
fi
if [ -z "${K8S_KUBECTL_CLUSTER_NAME:-}" ]; then
    export K8S_KUBECTL_CLUSTER_NAME="$(read_env_var K8S_KUBECTL_CLUSTER_NAME)"
fi

# ─────────────────────────────────────────────────────────────────
# Configure kubectl context using in-cluster service account
# ─────────────────────────────────────────────────────────────────
# CLI commands do `kubectl config use-context <name>`. In-cluster auth
# normally works without any kubeconfig, but use-context needs a named
# context to exist. We create one matching K8S_KUBECTL_DEFAULT_CONTEXT.

if [ -f /var/run/secrets/kubernetes.io/serviceaccount/token ]; then
    CONTEXT_NAME="${K8S_KUBECTL_DEFAULT_CONTEXT:-in-cluster}"
    TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
    CA_CRT=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

    echo "🔧 Setting up kubectl context: ${CONTEXT_NAME}"
    kubectl config set-cluster in-cluster \
        --server=https://kubernetes.default.svc \
        --certificate-authority="${CA_CRT}" \
        --embed-certs=true > /dev/null
    kubectl config set-credentials in-cluster \
        --token="${TOKEN}" > /dev/null
    kubectl config set-context "${CONTEXT_NAME}" \
        --cluster=in-cluster \
        --user=in-cluster > /dev/null
    kubectl config use-context "${CONTEXT_NAME}" > /dev/null
    echo "✅ kubectl context ${CONTEXT_NAME} active"
fi

# ─────────────────────────────────────────────────────────────────
# Kurtosis config — register k8s cluster and set it as active
# ─────────────────────────────────────────────────────────────────
# Kurtosis needs a cluster-config YAML at `$(kurtosis config path)` with
# a cluster definition, and a `cluster-setting` file pointing to which
# cluster is active.

# Kurtosis requires /etc/machine-id to generate its anonymized metrics user ID
if [ ! -f /etc/machine-id ]; then
    cat /proc/sys/kernel/random/uuid | tr -d '-' > /etc/machine-id 2>/dev/null || \
        echo "deadbeefdeadbeefdeadbeefdeadbeef" > /etc/machine-id
fi

# Kurtosis uses two directories:
#   - ${HOME}/.config/kurtosis/kurtosis-config.yml  (cluster definitions)
#   - ${HOME}/.local/share/kurtosis/cluster-setting (currently active cluster name)
KURTOSIS_CONFIG_DIR="${HOME}/.config/kurtosis"
KURTOSIS_SHARE_DIR="${HOME}/.local/share/kurtosis"
mkdir -p "${KURTOSIS_CONFIG_DIR}" "${KURTOSIS_SHARE_DIR}"

# CLI isSupportedClusterType accepts only "cloud" or "valset-sandbox3".
# Use "cloud" as the logical name; kubernetes-cluster-name points to actual k8s cluster.
KURTOSIS_CLUSTER_NAME="cloud"
K8S_CLUSTER="${K8S_KUBECTL_CLUSTER_NAME:-tooling-holesky-sandbox-0}"

echo "🔧 Writing Kurtosis config (cluster: ${KURTOSIS_CLUSTER_NAME} → k8s: ${K8S_CLUSTER})"
cat > "${KURTOSIS_CONFIG_DIR}/kurtosis-config.yml" <<EOF
config-version: 6
should-send-metrics: false
kurtosis-clusters:
  docker:
    type: "docker"
  ${KURTOSIS_CLUSTER_NAME}:
    type: "kubernetes"
    config:
      kubernetes-cluster-name: "${K8S_CLUSTER}"
      storage-class: "ssd-hostpath"
      enclave-size-in-megabytes: 256
EOF

printf "%s" "${KURTOSIS_CLUSTER_NAME}" > "${KURTOSIS_SHARE_DIR}/cluster-setting"
echo "✅ Kurtosis cluster set to ${KURTOSIS_CLUSTER_NAME}"

# ─────────────────────────────────────────────────────────────────
# Configure docker buildx to use the BuildKit sidecar
# ─────────────────────────────────────────────────────────────────
: "${BUILDKIT_HOST:=tcp://localhost:1234}"

if ! docker buildx ls 2>/dev/null | grep -q devnet-builder; then
    echo "🔧 Creating buildx remote builder → ${BUILDKIT_HOST}"
    docker buildx create \
        --name devnet-builder \
        --driver remote \
        --use \
        "${BUILDKIT_HOST}" \
        || echo "⚠️  buildx create failed (BuildKit sidecar may not be ready yet)"
fi

# Keep pod alive for kubectl exec
exec tail -f /dev/null
