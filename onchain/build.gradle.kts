import org.gradle.api.tasks.Exec
import groovy.json.JsonSlurper
import java.io.File

val shellScriptPath = "${projectDir}/scripts/get-genesis.sh"

fun Exec.setupEnvironmentVars() {
    val genesisTime = project.ext["GENESIS_TIME"] as? String
    if (genesisTime.isNullOrEmpty()) {
        throw GradleException("GENESIS_TIME is not set. Ensure extract-genesis-time has run successfully.")
    }

    environment("NETWORK", "local-devnet")
    environment("RPC_URL", "http://127.0.0.1:8545")
    environment("LOCAL_DEVNET_PK", "0x2e0834786285daccd064ca17f1654f67b4aef298acbb82cef9ec422fb4975622")
    environment("DEPLOYER", "0x123463a4b065722e99115d6c222f267d9cabb524")
    environment("GAS_PRIORITY_FEE", "1")
    environment("GAS_MAX_FEE", "100")
    environment("NETWORK_STATE_FILE", "deployed-${environment["NETWORK"]}.json")
    environment("NETWORK_STATE_DEFAULTS_FILE", "scripts/scratch/deployed-testnet-defaults.json")
    environment("GENESIS_TIME", genesisTime)
}

task("extract-genesis-time") {
    group = "onchain"
    doLast {
        val jsonFilePath = "${projectDir}/../devnet-dc/network/execution/genesis.json"
        val jsonFile = File(jsonFilePath)

        if (!jsonFile.exists()) {
            throw GradleException("JSON file does not exist at $jsonFilePath")
        }

        // Using JsonSlurper for JSON parsing
        val jsonSlurper = JsonSlurper()
        val jsonObject = jsonSlurper.parse(jsonFile) as Map<String, Any?>

        val timestampHex = jsonObject["timestamp"] as? String

        if (timestampHex.isNullOrEmpty()) {
            throw GradleException("The 'timestamp' property was not found or is empty.")
        }

        val timestampHexClean = timestampHex.removePrefix("0x")
        val timestampDec = timestampHexClean.toLong(16)

        println("GENESIS_TIME has been set to $timestampDec")

        project.ext.set("GENESIS_TIME", timestampDec.toString())
    }
}

task("setup-environment") {
    group = "onchain"
    dependsOn("extract-genesis-time")

    doFirst {
        // Retrieve GENESIS_TIME from project.ext
        val genesisTime = project.ext["GENESIS_TIME"] as? String
        if (genesisTime.isNullOrEmpty()) {
            throw GradleException("GENESIS_TIME is not set. Ensure extract-genesis-time has run successfully.")
        }
        println("GENESIS_TIME in setup-environment: $genesisTime")
    }
}

task("yarn-install", type = Exec::class) {
    group = "onchain"
    workingDir = file("${projectDir}/lido-core")
    commandLine("bash", "-c", "corepack enable && yarn")
}

task("verify-core", type = Exec::class) {
    group = "onchain"
    dependsOn("setup-environment", "yarn-install")
    workingDir = file("${projectDir}/lido-core")
    doFirst {
        setupEnvironmentVars()
        commandLine("bash", "-c", "yarn verify:deployed --network \$NETWORK || true")
    }
}

task("deploy-core-contracts", type = Exec::class) {
    group = "onchain"
    dependsOn("setup-environment", "yarn-install")
    workingDir = file("${projectDir}/lido-core")
    doFirst {
        setupEnvironmentVars()
        commandLine("bash", "-c", "scripts/dao-deploy.sh")
    }
}
