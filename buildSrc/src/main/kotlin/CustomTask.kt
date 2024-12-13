import org.gradle.api.*
import org.gradle.api.tasks.*
import org.gradle.kotlin.dsl.*

open class CustomTask : DefaultTask() {

    init {
        group = "My"
        description = "Prints a description of ${project.name}."
    }

    @TaskAction
    fun run() {
        println("I'm ${project.name}")
    }
}
