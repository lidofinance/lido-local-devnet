/*
 * This is a general purpose Gradle build.
 * Learn more about Gradle by exploring our samples at
 * https://docs.gradle.org/current/samples
 * https://docs.gradle.org/current/userguide/part6_writing_tasks.html
 */

task("start", GradleBuild::class) {
    group = "devnet"
    tasks = listOf("network:start", "blockscout:start", "dora:start")
}

task("restart", GradleBuild::class) {
    group = "devnet"
    tasks = listOf("stop", "start")
}

task("stop", GradleBuild::class) {
    group = "devnet"
    tasks = listOf("dora:stop", "blockscout:stop", "network:stop")
}

task("clean", GradleBuild::class) {
    group = "devnet"
    tasks = listOf("blockscout:clean", "network:clean")
}
