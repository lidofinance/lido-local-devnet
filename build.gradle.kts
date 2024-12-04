import org.codehaus.groovy.runtime.ProcessGroovyMethods

fun String.execute(): Process = ProcessGroovyMethods.execute(this)
fun List<String>.execute(): Process = ProcessGroovyMethods.execute(this)
fun Process.text(): String = ProcessGroovyMethods.getText(this)

/*
 * This is a general purpose Gradle build.
 * Learn more about Gradle by exploring our samples at
 * https://docs.gradle.org/current/samples
 * https://docs.gradle.org/current/userguide/part6_writing_tasks.html
 */

plugins {
    id("com.avast.gradle.docker-compose") version "0.17.11"
    id("org.ajoberstar.grgit") version "5.3.0"
}

val foundryPath = File("${System.getProperty("user.home")}/.foundry/bin/")
val castPath = File("${foundryPath}/cast").toString()

task("clean", Delete::class) {
    description = "Cleans all necessary files and directories"
    delete("${projectDir}/network/consensus/beacondata")
    delete("${projectDir}/network/consensus/validatordata")
    delete("${projectDir}/network/consensus/genesis.ssz")
    delete("${projectDir}/network/execution/geth")
    delete("${projectDir}/blockscout/services/blockscout-db-data")
    delete("${projectDir}/blockscout/services/logs")
    delete("${projectDir}/blockscout/services/redis-data")
}


task("start") {
    group = "devnet"
    description = "Start DevNet EL and CL Nodes"
    this.dependsOn(tasks["composeUp"])
}

task("stop") {
    group = "devnet"
    description = "Stop DevNet EL and CL Nodes"
    this.dependsOn(tasks["composeDown"])
}

task("restart", GradleBuild::class) {
    group = "devnet"
    description = "Restart DevNet EL and CL Nodes"
    tasks = listOf("stop", "clean", "start")
}

task("check", Exec::class) {
    group = "devnet"
    description = "Check DevNet is alive"
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
    waitForTcpPorts.set(false)
    dockerComposeWorkingDirectory.set(File("${projectDir}/network"))
}
