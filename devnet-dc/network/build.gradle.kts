/*
 * EL + CL tasks
 */

val foundryPath = File("${System.getProperty("user.home")}/.foundry/bin/")
val castPath = File("${foundryPath}/cast").toString()

tasks.register("clean", Delete::class) {
    group = "network"
    description = "Cleans all EL + CL files and directories"
    delete("${projectDir}/devnet-dc/network/consensus/beacondata")
    delete("${projectDir}/devnet-dc/network/consensus/validatordata")
    delete("${projectDir}/devnet-dc/network/consensus/genesis.ssz")
    delete("${projectDir}/devnet-dc/network/execution/geth")
    delete("${rootProject.buildDir}/devnet-dc/network")
}


tasks.register("up") {
    group = "network"
    description = "Start EL and CL Nodes"
    dependsOn("composeUp")
}

tasks.register("down") {
    group = "network"
    description = "Stop EL and CL Nodes and clean"
    dependsOn("composeDown")
}

tasks.register("test-test", Exec::class) {
    group = "network"
    description = "Some test"
    commandLine = listOf("echo", "test")
    workingDir = File("${projectDir}")
}

tasks.register("logs-el", Exec::class) {
    group = "network"
    description = "Tail EL Logs"
    commandLine = listOf("docker","compose", "logs", "geth", "-f")
    workingDir(projectDir)
}

tasks.register("logs-cl", Exec::class) {
    group = "network"
    description = "Tail CL Logs"
    commandLine = listOf("docker","compose", "logs", "beacon-chain", "-f")
    workingDir(projectDir)
}

tasks.register("logs-cl-validators", Exec::class) {
    group = "network"
    description = "Tail CL Validators"
    commandLine = listOf("docker", "compose", "logs", "geth", "-f")
}

tasks.register("check", Exec::class) {
    group = "network"
    description = "Check EL node is alive (can process transactions)"
    commandLine = listOf(
        castPath,
        "send",
        "--private-key",
        "0x2e0834786285daccd064ca17f1654f67b4aef298acbb82cef9ec422fb4975622",
        "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
        listOf(castPath, "from-utf8", "hello-world").execute().text().trim(),
        "--rpc-url",
        "http://127.0.0.1:8545/"
    )
}

dockerCompose {
    setProjectName("network")
    projectNamePrefix = ""
    useDockerComposeV2.set(true)
    removeVolumes.set(true)
    waitForTcpPorts.set(true)
    captureContainersOutputToFiles.set(File("${rootProject.buildDir}/network"))
    environment.put("GETH_IMAGE", "")
}
