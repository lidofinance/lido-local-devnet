import org.codehaus.groovy.runtime.ProcessGroovyMethods
import java.awt.Desktop
import java.net.URI

fun String.execute(): Process = ProcessGroovyMethods.execute(this)
fun List<String>.execute(): Process = ProcessGroovyMethods.execute(this)
fun Process.text(): String = ProcessGroovyMethods.getText(this)

fun openBrowser(url: String) {
    if (Desktop.isDesktopSupported())
    {
        Desktop.getDesktop().browse(URI(url))
    }
}

plugins {
    id("com.avast.gradle.docker-compose") version "0.17.11"
}

task("up") {
    group = "dora"
    description = "Start Dora"
    mustRunAfter(":network:up")
    dependsOn("composeUp")
}

task("down") {
    group = "dora"
    description = "Stop Dora"
    dependsOn("composeDown")
}

task("open-dora") {
    group = "dora"
    description = "Open Dora explorer in default browser"
    doFirst {
        openBrowser("http://localhost:3070")
    }
}

dockerCompose {
    setProjectName("dora")
    projectNamePrefix = ""
    useDockerComposeV2.set(true)
    removeVolumes.set(true)
    waitForTcpPorts.set(false)
}
