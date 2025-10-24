# Change Log

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