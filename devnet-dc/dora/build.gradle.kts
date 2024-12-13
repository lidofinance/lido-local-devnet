/*
 * Dora explorer tasks
 */

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
