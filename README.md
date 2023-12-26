# Vite Plugin Virtual Modules

This plugin allows you to easily create virtual modules (modules whose contents are created at build time) using normal javascript modules (files). 

This was originally created to get data for SSG apps, in order to avoid having to bring any of the fetching code and dependencies into the bundle/app. Instead just providing a JSON module of the fetch results. 

If you encounter bugs or have a feature request, feel free to open an issue on github.

**Features:**
- Use ES modules to create virtual modules (intuitive)
- HMR Update when you modify a host/loader module
- Watch other files for changes, to update virtual module
- Access to queries

**Table of Contents**

- [Vite Plugin Virtual Modules](#vite-plugin-virtual-modules)
  - [Vite Setup](#vite-setup)
  - [Usage](#usage)
  - [API](#api)
    - [Importing Virtual Module](#importing-virtual-module)
    - [Virtual Module Structure](#virtual-module-structure)
    - [Plugin Options](#plugin-options)
  - [Change Log](#change-log)


## Vite Setup

```js
import { defineConfig } from "vite";
import virtualModules from "@ulu/vite-plugin-virtual-modules";

export default defineConfig({
  plugins: [
    virtualModules({
      // See options
    })
  ]
});

```

## Usage

The example below just demonstrates returning JSON in an ES module but any form of ES module can be returned by the virtual module. In addition to the examples below, see "src/tests/" in this repo for more examples.

Say for example we were building a static site that displayed a list of users that are managed in a CMS. We want to fetch the data from the CMS via an endpoint and display only the results (JSON) in the page. 

Below is an example of the vistual module file, it fetches users from the CMS and returns an ES module that exposes the JSON (in string form). When this is imported in the application only the resulting JSON module will exist and the fetching logic will be left behind as part of the build process.

- The virtual module must provide default export function
- The function can be async
- The function must return either a string (the string version of ES module) or and object with 'code' and 'map' properties, which follow the Vite plugin transform API and could be used to provide the source map if needed.
- `toJsonModule()` below is a helper method that exported from this library. It wraps the JSON in an ES module.

```js
// fetch-users.js (mock code)

import { toJsonModule } from "../../index.js";
import { getContent, contentUpdated } from "./some-service.js";

export default function({ reload, isServe }) {
  return {
    async load() {
      try {
        const result = await getContent("users");
        const users = await result.json();

        // Reload this virtual module when something changes
        // - Only if running dev server
        if (isServe) {
          contentUpdated(() => reload());
        }
        
        return toJsonModule(users);
      } catch (error) {
        console.log(error);
      }
    }
  }
}
```

Now to use this dynamic module we import the file above like normal in combination with the special `?virtual-module` suffix.

```js
// user-view.js

import users from "./fetch-users.js?virtual-module";

// JSON: [ { user }, { user }, ... } ]
console.log(users); 

// ... Use the data however

```

Note: The context object contains details about the module. See context below. 
This can be used to adjust output based on queries.

```js
// dog-view.js

import dogs from "./fetch-animals.js?virtual-module&type=dog";

// JSON: [ { dog }, { dog } ]
console.log(dogs); 

// ... Use the data however
```


```js
// fetch-animals.js

import { toJsonModule } from "../../index.js";

export default function({ queries }) {
  return {
    load() {
      if (queries.type) {
        return toJsonModule(await animalsByType(queries.type));
      } else {
        return toJsonModule(await allAnimals());
      }
    }
  }
}
```

## API

### Importing Virtual Module

```js
// The suffix "?virtual-module" is used to load the module as a virtual module
import testReload from "./path/to/file.js?virtual-module";
// Using queries
import testQuery from "./path/to/file.js?virtual-module&type=dog";
```

### Virtual Module Structure

This is the module that creates the virtual module. 

```js
export default function({ 
  // Module ID (import path)
  id,
  // Any URL queries passed
  queries,
  // Boolean is the serve command
  isServe,
  // String command name (build, serve, etc)
  command,
  // The path to this file
  filePath,
  // The path that is used by node to import the module
  importPath,
  // Function that will reload this module (call load again) when called
  // - Use to udpate the module programmatically
  reload
}) {
  return {
    // Function that should return a string version of module to load
    // - Recieves an array of watchedFiles if watch is set
    // - Can be async
    load(watchedFiles) {
      // return  "export default..."
    },
    // Watch files option (anything valid to be passed to chokidar)
    // - By default cwd is this module's director 
    //   so everything is relative to this file
    watch: ["some/files/**/*.txt"],
    // Options to pass to Chokidar
    watchOptions: {},
    // Events that should trigger reload of module
    watchEvents: ["add", "unlink", "change", "unlinkDir", "addDir"]
  }
}
```

### Plugin Options

Options that can be passed when adding this plugin to vite

```js
import { defineConfig } from "vite";
import virtualModules from "@ulu/vite-plugin-virtual-modules";

export default defineConfig({
  plugins: [
    virtualModules({
      // Suffix on the end of imports (Regex)
      suffix: /\?virtual-module(&.*)*$/,
      // Events that trigger reload when watching
      // - Can be overridden by loader module
      watchEvents: ["add", "unlink", "change", "unlinkDir", "addDir"],
      // Options to be passed to Chokidar for watching 
      // - Can be overridden by loader module
      watchOptions: {}
    })
  ]
});

```


## Change Log

[Change Log](./CHANGELOG.md)