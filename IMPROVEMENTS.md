
# List of features to improve
* Make the lido-local-devnet easily extensible
* Idempotence for all commands
* Merge services, state, artifacts into a new entity called "project"
  * the devnet is a root project
  * kapi, lido-core, lido-cli are subprojects
  * each subproject has
    * commands
    * templates
    * services
      * artifacts
      * has optional git repo
      * workspace
        * patches
    * constants
* Add the ability to patch docker images with files, having special `pathes` folder
* Add the ability to patch git repos with files, having special `pathes` folder
* Look at cdk8s
