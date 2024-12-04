import org.codehaus.groovy.runtime.ProcessGroovyMethods

fun String.execute(): Process = ProcessGroovyMethods.execute(this)
fun List<String>.execute(): Process = ProcessGroovyMethods.execute(this)
fun Process.text(): String = ProcessGroovyMethods.getText(this)

plugins {
    id("com.avast.gradle.docker-compose") version "0.17.11"
    id("org.ajoberstar.grgit") version "5.3.0"
}

task("start") {
    group = "dora"
    description = "Start Dora"
    dependsOn("composeUp")
}

task("stop") {
    group = "dora"
    description = "Stop Dora"
    dependsOn("composeDown")
}

task("restart", GradleBuild::class) {
    group = "dora"
    description = "Restart Dora"
    tasks = listOf("stop", "clean", "start")
}

dockerCompose {
    setProjectName("dora")
    projectNamePrefix = ""
    useDockerComposeV2.set(true)
    removeVolumes.set(true)
    waitForTcpPorts.set(false)
}
