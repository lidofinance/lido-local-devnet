/*
 * The settings file is used to specify which projects to include in your build.
 *
 * Detailed information about configuring a multi-project build in Gradle can be found
 * in the user manual at https://docs.gradle.org/7.2/userguide/multi_project_builds.html
 */

rootProject.name = "lido-local-devnet"
include(":network")
project(":network").projectDir = file("devnet-dc/network")

include(":onchain")
project(":onchain").projectDir = file("onchain")

include(":blockscout")
project(":blockscout").projectDir = file("devnet-dc/blockscout")

include(":dora")
project(":dora").projectDir = file("devnet-dc/dora")

gradle.beforeProject {
    tasks.withType<Exec> {
        environment("TERM", "xterm-256color")
        environment("FORCE_COLOR", "true")
    }
}
