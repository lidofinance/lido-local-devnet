import org.codehaus.groovy.runtime.ProcessGroovyMethods

fun String.execute(): Process = ProcessGroovyMethods.execute(this)
fun List<String>.execute(): Process = ProcessGroovyMethods.execute(this)
fun Process.text(): String = ProcessGroovyMethods.getText(this)

plugins {
    // docs https://github.com/avast/gradle-docker-compose-plugin
    id("com.avast.gradle.docker-compose") version "0.17.11"
}

val foundryPath = File("${System.getProperty("user.home")}/.foundry/bin/")
val castPath = File("${foundryPath}/cast").toString()

task("clean", Delete::class) {
    group = "network"
    description = "Cleans all EL + CL files and directories"
    delete("${projectDir}/network/consensus/beacondata")
    delete("${projectDir}/network/consensus/validatordata")
    delete("${projectDir}/network/consensus/genesis.ssz")
    delete("${projectDir}/network/execution/geth")
    delete("${rootProject.buildDir}/network")
}


task("up") {
    group = "network"
    description = "Start EL and CL Nodes"
    dependsOn("composeUp")
}

task("down") {
    group = "network"
    description = "Stop EL and CL Nodes and clean"
    dependsOn("composeDown")
}

task("logs-el", Exec::class) {
    group = "network"
    description = "Tail EL Logs"
    commandLine = listOf("docker","compose", "logs", "geth", "-f")
    workingDir(projectDir)
}

task("logs-cl", Exec::class) {
    group = "network"
    description = "Tail CL Logs"
    commandLine = listOf("docker","compose", "logs", "beacon-chain", "-f")
    workingDir(projectDir)
}

task("logs-cl-validators", Exec::class) {
    group = "network"
    description = "Tail CL Validators"
    commandLine = listOf("docker", "compose", "logs", "geth", "-f")
}

task("check", Exec::class) {
    group = "network"
    description = "Check EL node is alive (can process transactions)"
    doFirst {
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
}

dockerCompose {
    setProjectName("network")
    projectNamePrefix = ""
    useDockerComposeV2.set(true)
    removeVolumes.set(true)
    waitForTcpPorts.set(true)
    captureContainersOutputToFiles.set(File("${rootProject.buildDir}/network"))
}
