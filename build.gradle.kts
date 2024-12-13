/*
 * This is a general purpose Gradle build.
 *
 * Learn more about Gradle by exploring our samples at
 * https://docs.gradle.org/current/samples
 * https://docs.gradle.org/current/userguide/part6_writing_tasks.html
 */

plugins {
    // docs https://github.com/avast/gradle-docker-compose-plugin
    id("com.avast.gradle.docker-compose") version "0.17.11"
    // docs https://bmuschko.github.io/gradle-docker-plugin/current/user-guide/#usage
    id ("com.bmuschko.docker-remote-api") version "9.4.0"
}

// applying plugins to subprojects
subprojects {
    plugins.apply("com.avast.gradle.docker-compose")
    plugins.apply("com.bmuschko.docker-remote-api")
}


task("start") {
    group = "devnet"
    dependsOn(":network:up")
    dependsOn(":blockscout:up")
    dependsOn(":dora:up")
}

task("restart") {
    group = "devnet"
    dependsOn("stop", "start")
    tasks["start"].mustRunAfter("stop")
}

task("stop") {
    group = "devnet"
    dependsOn(":dora:down", ":blockscout:down", ":network:down")
}

task("clean") {
    group = "devnet"
    dependsOn("blockscout:clean", "network:clean")
}
