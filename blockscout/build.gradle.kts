import org.codehaus.groovy.runtime.ProcessGroovyMethods
import java.awt.Desktop
import java.net.URI

fun String.execute(): Process = ProcessGroovyMethods.execute(this)
fun List<String>.execute(): Process = ProcessGroovyMethods.execute(this)
fun Process.text(): String = ProcessGroovyMethods.getText(this)

fun openBrowser(url: String) {
    if (Desktop.isDesktopSupported())
    {
        Desktop.getDesktop().browse(URI(url));
    }
}

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

task("up") {
    group = "blockscout"
    description = "Start Blockscout"
    mustRunAfter(":network:up")
    dependsOn("composeUp", "open-blockscout")
}

task("down") {
    group = "blockscout"
    description = "Stop Blockscout"
    dependsOn("composeDown")
}

task("open-blockscout") {
    group = "blockscout"
    description = "Open Blockscout explorer in the default browser"
    doFirst {
        openBrowser("http://localhost:3080/")
    }
}

dockerCompose {
    setProjectName("blockscout")
    projectNamePrefix = ""
    useComposeFiles.set(listOf("geth.yml"))
    useDockerComposeV2.set(true)
    removeVolumes.set(true)
    waitForTcpPorts.set(false)
}
