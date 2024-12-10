/*
 * This is a general purpose Gradle build.
 * Learn more about Gradle by exploring our samples at
 * https://docs.gradle.org/current/samples
 * https://docs.gradle.org/current/userguide/part6_writing_tasks.html
 */

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
