# Change Log

# 1.1.0

- API Change for loader's load() arguments (**Breaking Change**)
  - Used to be an array of watched files `load(watchedFilesArray) { ... }`
  - Is now an object with `load({ watchedFiles, data, context }) { ... }`
    - Where watchedFiles is an array of files being watched
    - Data is the data that was passed by whatever called reload() and if called internally because of file watcher it will be passed event data from Chokidar and this plugin to use programmatically
    - Context is just a reference to the context object (same as what is passed to virtual module factory function)
- Add reload data for watching
  - Add watcher event data to loaders load methods. Load methods called from a watcher will have a second argument for data which when triggered from a watcher will include the Chokidar event, timestamp and file that changed
- Cache Busting Logic Fix: 
  - In setupModuleWatcher, importPaths.set now uses filePath (the ID without query parameters) as the key instead of the raw id which would include the queries/etc
  - Similarly, createContext now resolves importPath using filePath. This ensures that cache-busting query strings are appended to the base file path correctly, avoiding potential issues where the ID might contain other parameters. Now cache busting will be per module not per each's unique id with query

# 1.0.3

- Fix error handling when an error originates from within a virtual module 
  - If an error occurs when this plugin loads the virtual module, it will now call rollup error in addition to logging the original error to the console. Which should make errors inside virtual module code easier to trace and not show unrelated errors (fs events .node error, outdated deps waring, etc)
- Update README (documentation) so it's a little easier to understand what this plugin does

# 1.0.2

- Added extra escaping of JSON string in utility toJsonModule()
  - Had issues with JSON that had escaped characters ie '{ "test" : "wow \"hello\" how are you" }', since this is being stored as a JS file
  - Now the JSON string is also stringified to properly escape the quotes inside it when stored as a string

# 1.0.0 

- Changed API to allow for more flexibility, new API supports
  - Reloading a module manually
  - Watching other files and changing the virtual module based on those file changes
  - Options for watching
  - Watching the host module for changes
  - Circumventing node module caching for altering host module
  - Adding context information 