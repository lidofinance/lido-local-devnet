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
    id("org.ajoberstar.grgit") version "5.3.0"
}

task("start", GradleBuild::class) {
    group = "dora"
    description = "Start Dora"
    tasks = listOf("composeUp", "open-dora")
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
