# Vite Plugin Virtual Modules

This plugin allows you to easily create virtual modules (modules whose contents are created at build time) using normal javascript modules. 

This was originally created to get data for SSG apps, in order to avoid having to bring any of the fetching code and dependencies into the bundle/app. Instead just providing a JSON module of the fetch results. 

The example below just demonstrates returning JSON in an ES module but any form of ES module can be returned by the virtual module. 

## Vite Setup

```js
import { defineConfig } from "vite";
import virtualModules from "@ulu/vite-plugin-virtual-modules";

export default defineConfig({
  plugins: [
    virtualModules()
  ]
});

```

## Usage Example

Say for example we were building a static site that displayed a list of users that are managed in a CMS. We want to fetch the data from the CMS via an endpoint and display only the results (JSON) in the page. 

Below is an example of the vistual module file, it fetches users from the CMS and returns an ES module that exposes the JSON (in string form). When this is imported in the application only the resulting JSON module will exist and the fetching logic will be left behind as part of the build process.

- The virtual module must provide default export function
- The function can be async
- The function must return either a string (the string version of ES module) or and object with 'code' and 'map' properties, which follow the Vite plugin transform API and could be used to provide the source map if needed.
- `toJsonModule()` below is a helper method that exported from this library. It wraps the JSON in an ES module.

```js
// fetch-users.js

import { toJsonModule } from "@ulu/vite-plugin-virtual-modules";

// Only the result of this function will be loaded as a module
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

Now to use this dynamic module we import the file above like normal in combination with the special `?virtual-module` suffix.

```js
// user-view.js

import users from "./fetch-users.js?virtual-module";

// JSON: [ { user }, { user }, ... } ]
console.log(users); 

// ... Use the data however

```

Note: When the virtual module is initialized it is passed the modules ID from Vite (import url). This could be used to pass further parameters in the way of URL queries if needed. Like arguments to the virtual module creator.

```js
// dog-view.js

import dogs from "./fetch-animals.js?virtual-module&type=dog";

// JSON: [ { dog }, { dog } ]
console.log(dogs); 

// ... Use the data however
```


```js
// fetch-animals.js

import url from "url";

export default async function(id) {
  const queries = url.parse(id, true)?.query;
  const type = queries?.type;
  if (type) {
    return await animalsByType(type);
  } else {
    // ...
  }
}
```

## Todo/Ideas

- Pass method to user's virtual module default to allow updating the value programmatically (for dev server local stuff), `export default function(id, { update }) { ... someEvent((data) => update(data)); ...}` or an invalidate method and the function would be called again (versus updating inside the creation function) `export default function(id, { invalidate }) { someEvent((data) => update(data)); }`
