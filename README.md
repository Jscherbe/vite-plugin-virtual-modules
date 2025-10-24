# @ulu/vite-plugin-virtual-modules

This plugin allows you to easily create "virtual modules" (modules whose contents are generated at build time) using standard JavaScript files as "loaders".

At its core, you write a Node.js module that runs during the Vite build process. This module's job is to generate the code for a new, virtual module that your application can then import.

This is especially useful for things like build-time data fetching for SSG apps, injecting build-time constants, or generating modules from custom file types. It avoids bringing server-side code and dependencies into your browser bundle.

**Features:**
- Use standard ES modules to create virtual modules.
- HMR updates for your virtual module when you modify the loader.
- Watch other files for changes to trigger a reload of the virtual module.
- Pass query parameters to your loader module.

*If you encounter bugs or have a feature request, feel free to open an issue on github.*

**Table of Contents:**

- [A Simple Example](#a-simple-example)
- [Vite Setup](#vite-setup)
- [Usage](#usage)
  - [Advanced Example: Data Fetching](#advanced-example-data-fetching)
  - [Using Queries](#using-queries)
- [API](#api)
  - [Importing a Virtual Module](#importing-a-virtual-module)
  - [The `toJsonModule` Helper](#the-tojsonmodule-helper)
  - [Loader Module Structure](#loader-module-structure)
    - [Context Object](#context-object)
  - [Plugin Options](#plugin-options)
- [Change Log](#change-log)


## A Simple Example

1.  **Create a "loader" module.** This code runs in Node.js.

    ```javascript
    // build-time.js
    export default function() {
      return {
        load() {
          // This string will become the content of the virtual module
          const moduleContent = `export default "Built at: ${new Date().toLocaleString()}";`;
          return moduleContent;
        }
      }
    }
    ```

2.  **Import the virtual module in your app.**

    ```javascript
    // main.js
    import buildTimestamp from "./build-time.js?virtual-module";

    // Logs: "Built at: 10/24/2025, 10:30:00 AM" (for example)
    console.log(buildTimestamp);
    ```

The `build-time.js` file is executed by Node.js, and the string it returns becomes the `buildTimestamp` module your app imports. The loader itself is never sent to the browser.

## Vite Setup

```js
// vite.config.js
import { defineConfig } from "vite";
import virtualModules from "@ulu/vite-plugin-virtual-modules";

export default defineConfig({
  plugins: [
    virtualModules({
      // See options below
    })
  ]
});
```

## Usage

### Advanced Example: Data Fetching

A common use case is to fetch data from a CMS at build time for a static site. This prevents your data-fetching logic and any associated dependencies from being included in the final browser bundle.

Below is an example of a loader module that fetches users from an API and provides the result as a JSON module.

```javascript
// fetch-users.js (this is the loader module)

import { toJsonModule } from "@ulu/vite-plugin-virtual-modules";
import { getContent, contentUpdated } from "./some-service.js";

// This function receives a context object (see API section)
export default function({ reload, isServe }) {
  return {
    async load() {
      try {
        const result = await getContent("users");
        const users = await result.json();

        // During development, we can set up HMR.
        // Here, we imagine `contentUpdated` is a function from our service
        // that calls a callback when the CMS content changes.
        if (isServe) {
          contentUpdated(() => reload());
        }
        
        // Use the helper to safely create a JSON module
        return toJsonModule(users);
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  }
}
```

Now, to use this data, you import the file with the special `?virtual-module` suffix.

```javascript
// user-view.js (in your application)

import users from "./fetch-users.js?virtual-module";

// `users` is now the JSON array: [ { user }, { user }, ... } ]
console.log(users); 

// ... Use the data in your components
```

### Using Queries

You can pass URL queries when importing a virtual module to change its output.

```javascript
// dog-view.js
import dogs from "./fetch-animals.js?virtual-module&type=dog";

console.log(dogs); // JSON: [ { dog }, { dog } ]
```

The loader module can access these queries via the context object.

```javascript
// fetch-animals.js
import { toJsonModule } from "@ulu/vite-plugin-virtual-modules";

export default function({ queries }) {
  return {
    async load() {
      if (queries.type) {
        const animals = await animalsByType(queries.type);
        return toJsonModule(animals);
      }
    }
  }
}
```

## API

### Importing a Virtual Module

To trigger the plugin, add the `?virtual-module` suffix to your import path.

```javascript
// The suffix tells Vite to process this import with this plugin
import myModule from "./path/to/loader.js?virtual-module";

// You can also add queries
import myQueriedModule from "./path/to/loader.js?virtual-module&foo=bar";
```

### The `toJsonModule` Helper

This plugin exports a helper function, `toJsonModule`, to make it easy to create a module that default exports JSON data.

```javascript
import { toJsonModule } from "@ulu/vite-plugin-virtual-modules";

const myData = { key: "value", other: [1, 2] };
const moduleCode = toJsonModule(myData);
// moduleCode is now:
// 'export default JSON.parse("{\"key\":\"value\",\"other\":[1,2]}")'
```

You might wonder why it uses `JSON.stringify` twice. This is a necessary trick to safely embed a JSON string *inside* a JavaScript string. It ensures that all quotes and special characters are correctly escaped, so `JSON.parse()` will work reliably in the final module.

### Loader Module Structure

The "loader module" is the file you create that generates the virtual module. It must have a default export that is a function. This function returns an object that configures the virtual module's content and behavior.

```javascript
export default function(context) {
  // `context` is an object with helpful properties (see below)
  
  return {
    // REQUIRED
    // A function that returns the code for the virtual module.
    // Can be async.
    load(watchedFiles) {
      // `watchedFiles` is an array of files if `watch` is used.
      return "export default '''hello world'''";
    },

    // OPTIONAL
    // Watch files for changes and trigger HMR.
    // Paths are relative to this loader module file.
    watch: ["some/files/**/*.txt"],
    
    // OPTIONAL
    // Options passed directly to the `chokidar` watcher.
    watchOptions: {},
    
    // OPTIONAL
    // Events that should trigger a reload.
    watchEvents: ["add", "unlink", "change"]
  }
}
```

#### Context Object

Your loader module's default function will be called with a `context` object containing:

- `id`: The full import ID string (e.g., `/path/to/loader.js?virtual-module&foo=bar`).
- `filePath`: The absolute path to the loader module file.
- `importPath`: The path used by Node to import the module (can change for HMR).
- `queries`: An object containing the URL queries from the import ID.
- `isServe`: A boolean indicating if the Vite dev server is running (`true` for `vite serve`).
- `command`: The current Vite command (`'serve'` or `'build'`).
- `reload`: A function to programmatically trigger a reload (HMR) of this module.

### Plugin Options

Options that can be passed when adding this plugin in `vite.config.js`.

```js
// vite.config.js
import virtualModules from "@ulu/vite-plugin-virtual-modules";

export default {
  plugins: [
    virtualModules({
      // Regex to identify virtual module imports.
      suffix: /\?virtual-module(&.*)*$/,
      
      // Default events that trigger a reload when watching files.
      // Can be overridden in the loader module.
      watchEvents: ["add", "unlink", "change", "unlinkDir", "addDir"],
      
      // Default options passed to Chokidar for file watching.
      // Can be overridden in the loader module.
      watchOptions: {}
    })
  ]
};
```

## Change Log

[Change Log](./CHANGELOG.md)
