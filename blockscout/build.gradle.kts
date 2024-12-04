import org.codehaus.groovy.runtime.ProcessGroovyMethods

fun String.execute(): Process = ProcessGroovyMethods.execute(this)
fun List<String>.execute(): Process = ProcessGroovyMethods.execute(this)
fun Process.text(): String = ProcessGroovyMethods.getText(this)

plugins {
    id("com.avast.gradle.docker-compose") version "0.17.11"
    id("org.ajoberstar.grgit") version "5.3.0"
}

task("clean", Delete::class) {
    description = "Cleans all Blockscout files and directories"
    delete("${projectDir}/blockscout/services/blockscout-db-data")
    delete("${projectDir}/blockscout/services/logs")
    delete("${projectDir}/blockscout/services/redis-data/dump.rdb")
    delete("${projectDir}/blockscout/services/redis-data")
}

task("start") {
    group = "blockscout"
    description = "Start Blockscout"
    dependsOn("composeUp")
}

task("stop", GradleBuild::class) {
    group = "blockscout"
    description = "Stop Blockscout"
    tasks = listOf("composeDown", "clean")
}

dockerCompose {
    setProjectName("blockscout")
    projectNamePrefix = ""
    useComposeFiles.set(listOf("geth.yml"))
    useDockerComposeV2.set(true)
    removeVolumes.set(true)
    waitForTcpPorts.set(false)
}
