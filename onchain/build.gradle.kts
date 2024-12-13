/*
 * Lido core tasks
 */
val hardhatNetwork = "local-devnet"
val networkStateFileName = "deployed-${hardhatNetwork}.json"
val containerName = "lido-core-scratch-deploy"


val renderTestnetDefaults = tasks.register("render-defaults-from-template", Copy::class) {
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

val statLidoCoreScratchDeployContainer = tasks.register("start-lido-core-containers") {
    group = "lido-core-helpers"

    dockerCompose {
        setProjectName("onchain")
        captureContainersOutput.set(true)
        projectNamePrefix = ""
        buildBeforeUp.set(true)
        checkContainersRunning.set(true)
        useComposeFiles.set(listOf("docker-compose.lido-core.yml"))
        useDockerComposeV2.set(true)
        removeVolumes.set(false)
        captureContainersOutputToFiles.set(File("${rootProject.buildDir}/onchain"))
        environment.putAll(
            mapOf(
                "GENESIS_TIME" to getGenesisTime(file("${rootDir}/devnet-dc/network/execution/genesis.json")),
                "ETHERSCAN_API_KEY" to "",
                "DEPOSIT_CONTRACT" to "0x4242424242424242424242424242424242424242",
                "NETWORK" to hardhatNetwork,
                "RPC_URL" to "http://execution:8545",
                "LOCAL_DEVNET_PK" to "0x2e0834786285daccd064ca17f1654f67b4aef298acbb82cef9ec422fb4975622",
                "DEPLOYER" to "0x123463a4b065722e99115d6c222f267d9cabb524",
                "GAS_PRIORITY_FEE" to "1",
                "GAS_MAX_FEE" to "100",
                "NETWORK_STATE_FILE" to networkStateFileName,
                "NETWORK_STATE_DEFAULTS_FILE" to "deployed-testnet-defaults.json"
            )
        )
    }

    dependsOn("composeUp")
    dependsOn(renderTestnetDefaults)
    tasks["composeUp"].shouldRunAfter(renderTestnetDefaults)
}

val daoDeploy = tasks.register("dao-deploy", Exec::class) {
    group = "lido-core-helpers"
    dependsOn(statLidoCoreScratchDeployContainer)
    commandLine = listOf(
        "docker", "exec",
        containerName,
        "/bin/bash", "-c", "./scripts/dao-deploy.sh"
    )
}

val copyDevNetJsonFile = tasks.register("copy-devnet-json-file", Exec::class) {
    group = "lido-core-helpers"
    dependsOn(daoDeploy)
    commandLine = listOf(
        "docker", "exec",
        containerName,
        "cp", "${networkStateFileName}", "/var/lido-core/devnet-specs/${networkStateFileName}"
    )
}

val chmodDevNetJsonFile = tasks.register("chmod-devnet-json-file", Exec::class) {
    group = "lido-core-helpers"
    dependsOn(copyDevNetJsonFile)
    commandLine = listOf(
        "docker", "exec",
        containerName,
        "/bin/chmod", "-R" ,"o+rwx", "/var/lido-core/devnet-specs/"
    )
}

tasks.register("deploy-lido-core") {
    group = "lido-core"
    description = "Deploys Lido Core to devnet and get devnet.json file"

    dependsOn(chmodDevNetJsonFile)
    dependsOn("composeDown")
    tasks["composeDown"].shouldRunAfter(chmodDevNetJsonFile)
}
