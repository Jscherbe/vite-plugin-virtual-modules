# Vite Plugin Virtual Modules

This plugin allows you to easily create virtual modules (modules whose contents are created at build time) using normal javascript modules. 

This was originally created to allow accessing API through standard javascript modules for SSG apps, but to avoid having to bring any of the fetching code to the bundle/app. Instead just providing a JSON module of the fetches results. 

Note: When the virtual module is initialized it is passed the modules ID from Vite (import url). This could be used to pass further parameters in the way of URL queries if needed. Like arguments to the virtual module creator.

The example below just demonstrates returning a JSON es module but any form of ES module can be returned by the virtual module. 

## Vite Setup

```js
import { defineConfig } from "vite";
import virtualModules from "@ulu/vite-plugin-sheetjs";

export default defineConfig({
  plugins: [
    virtualModules(),
  ]
});

```


## Usage Example

Loading a users list from CMS, only including the JSON data in the app. No request code, api query, etc.

```js
// user-view.js
import users from "./fetch-users.js?virtual-module";

// JSON: [{ user }, { user }, ... }]
console.log(users); 

// ... Use the data however

```

Now in the virtual module file, which was imported in our app file in the example below, we setup our fetching code and return the new JSON module using the `toJsonModule` helper.

- The virtual module must provide default with a function
- The function can be async
- The function must return either a string (the string version of ES module) or and object with 'code' and 'map' properties, which follow the Vite plugin transform API and could be used to provide the source map if needed.

```js
// fetch-users.js

// Helper method to convert to ES module
import { toJsonModule } from "../index.js";

// Only the result of this function will be loaded as a module in the app
// - id (module ID from vite if needed)
export default async function(id) {
  try {
    const result = await fetch("https://jsonplaceholder.org/users");
    const users = await result.json();
    return toJsonModule(users);
  } catch (error) {
    console.log(error);
  }
}
```
