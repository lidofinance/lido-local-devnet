/*
 * Lido core tasks
 */

val generateTestnetDefaults = tasks.register("generate-defaults", Copy::class) {
    group = "lido-core-helpers"
    description = "Generates deployed-testnet-defaults.json file"

    include("deployed-testnet-defaults.json.template")
    from("${projectDir}")
    into("${projectDir}")
    rename { file -> "deployed-testnet-defaults.json" }
    expand(
        "GENESIS_TIME" to getGenesisTime(file("${rootDir}/devnet-dc/network/execution/genesis.json")),
        "DEPOSIT_CONTRACT" to "0x4242424242424242424242424242424242424242",
    )
}

val buildLidoImage = tasks.register("build-image", Exec::class) {
    group = "lido-core-helpers"
    workingDir = file("${projectDir}")
    val imageTag = "lido-core:latest"
    val dockerFile = "lido-core.Dockerfile"
    setIgnoreExitValue(false)
    commandLine = listOf(
        "docker",
        "build",
        "--no-cache",
        "-t",
        "${imageTag}",
        "-f",
        "${dockerFile}",
        "."
    )
}

val removeContainerIfAny = tasks.register("remove-container", Exec::class) {
    group = "lido-core-helpers"
    workingDir = file("${projectDir}")
    val imageTag = "lido-core:latest"
    val dockerFile = "lido-core.Dockerfile"
    setIgnoreExitValue(true)
    commandLine = listOf(
        "docker",
        "container",
        "rm",
        "lido-core-scratch-deploy",
        "--force",
        "--volumes",
    )
}

val lidoContainer = tasks.register("run-container", Exec::class) {
    group = "lido-core-helpers"

    dependsOn(generateTestnetDefaults)
    dependsOn(removeContainerIfAny)
    dependsOn(buildLidoImage)

    val hardhatNetwork = "local-devnet"
    val dockerEnvs = mapOf(
        "GENESIS_TIME" to getGenesisTime(file("${rootDir}/devnet-dc/network/execution/genesis.json")).toString(),
        "ETHERSCAN_API_KEY" to "",
        "DEPOSIT_CONTRACT" to "0x4242424242424242424242424242424242424242",
        "NETWORK" to hardhatNetwork,
        "RPC_URL" to "http://execution:8545",
        "LOCAL_DEVNET_PK" to "0x2e0834786285daccd064ca17f1654f67b4aef298acbb82cef9ec422fb4975622",
        "DEPLOYER" to "0x123463a4b065722e99115d6c222f267d9cabb524",
        "GAS_PRIORITY_FEE" to "1",
        "GAS_MAX_FEE" to "100",
        "NETWORK_STATE_FILE" to "deployed-${hardhatNetwork}.json",
        "NETWORK_STATE_DEFAULTS_FILE" to "deployed-testnet-defaults.json"
    ).map { "--env=${it.key}=${it.value}" }

    val cmd = listOf(
        "docker",
        "run",
        *(dockerEnvs.toTypedArray()),
        "--volume", "${projectDir}/deployed-testnet-defaults.json:/var/lido-core/deployed-testnet-defaults.json:ro",
        "--volume", "${projectDir}/lido-core-specs:/var/lido-core/scripts/scratch",
        "--network", "devnet",
        "--name", "lido-core-scratch-deploy",
        "--detach",
        "--tty",
        "--rm",
        "lido-core:latest",
    )
    //println("dockerEnvs = ${dockerEnvs}")
    //println("cmd = ${cmd.joinToString(" ")}")

    workingDir = file("${projectDir}")
    commandLine = cmd
}

val lidoExecContainer = tasks.register("exec-container", Exec::class) {
    group = "lido-core-helpers"
    dependsOn(lidoContainer)

    workingDir = file("${projectDir}")
    commandLine = listOf(
        "docker",
        "exec",
        //"-it",
        "lido-core-scratch-deploy",
        "/bin/bash", "-c", "./scripts/dao-deploy.sh"
    )
    doLast {
        "docker stop lido-core-scratch-deploy --force".execute().text().trim()
    }
}

tasks.register("deploy-lido-core") {
    group = "lido-core"
    description = "Deploys Lido Core to devnet"

    dependsOn(lidoExecContainer)
}
