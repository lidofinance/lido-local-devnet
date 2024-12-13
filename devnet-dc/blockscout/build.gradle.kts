/*
 * Blockscout explorer tasks
 */

task("up") {
    group = "blockscout"
    description = "Start Blockscout"
    mustRunAfter(":network:up")
    dependsOn("composeUp")
}

task("clean") {
    group = "blockscout"
    description = "Cleans all Blockscout files and directories"
    delete("${projectDir}/devnet-dc/blockscout/services/blockscout-db-data")
    delete("${projectDir}/devnet-dc/blockscout/services/logs")
    delete("${projectDir}/devnet-dc/blockscout/services/redis-data/dump.rdb")
    delete("${projectDir}/devnet-dc/blockscout/services/redis-data")
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
