import org.codehaus.groovy.runtime.ProcessGroovyMethods
import org.gradle.api.GradleException
import java.awt.Desktop
import java.net.URI
import groovy.json.JsonSlurper
import java.io.File

/**
 * Opens up aan URI in a default browser
 */
fun openBrowser(url: String) {
    if (Desktop.isDesktopSupported())
    {
        Desktop.getDesktop().browse(URI(url));
    }
}

/**
 * Ad-hoc logic for all the project
 */
fun String.execute(): Process = ProcessGroovyMethods.execute(this)
fun List<String>.execute(): Process = ProcessGroovyMethods.execute(this)
fun Process.text(): String = ProcessGroovyMethods.getText(this)


/**
 * Gets genesis time from genesis.json file
 */
fun getGenesisTime(jsonGenesisFile: File): Long {
    val jsonFile = jsonGenesisFile

    if (!jsonFile.exists()) {
        throw GradleException("JSON file does not exist at ${jsonFile.path}")
    }

    // Using JsonSlurper for JSON parsing
    val jsonSlurper = JsonSlurper()
    val jsonObject = jsonSlurper.parse(jsonFile) as Map<*, *>

    val timestampHex = jsonObject["timestamp"] as? String

    if (timestampHex.isNullOrEmpty()) {
        throw GradleException("The 'timestamp' property was not found or is empty.")
    }

    val timestampHexClean = timestampHex.removePrefix("0x")
    val timestampDec = timestampHexClean.toLong(16)

    return timestampDec
}
