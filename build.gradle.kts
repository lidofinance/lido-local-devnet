/*
 * This file was generated by the Gradle 'init' task.
 *
 * This is a general purpose Gradle build.
 * Learn more about Gradle by exploring our samples at https://docs.gradle.org/7.2/samples
 */

plugins {
    id("com.avast.gradle.docker-compose") version "0.17.11"
}

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

task("start", Exec::class) {
    commandLine = listOf("docker-compose","up", "-d")
    workingDir = File("${projectDir}/network")
}

//dockerCompose.isRequiredBy(tasks["start"])

dockerCompose {
    //useComposeFiles.add("${projectDir}/network/docker-compose.yml")
    useDockerComposeV2.set(true)
    dockerComposeWorkingDirectory.set(File("${projectDir}/network"))
}
