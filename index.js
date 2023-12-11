const pluginName = '@ulu/vite-plugin-virtual-modules';
const suffixRegex = /\?virtual-module(&.*)*$/;
const virtualPrefix = '\0';

/**
 * Vite plugin to convert normal js file into server side loaded JSON
 * @example
 *   // Importing will actuall be importing the JSON returned by the js file
 *   // the JS file will not be imported into the app just the JSON it returns
 *   import authors from "./data.js?virtual-module";
 * 
 *   // Inside data.js
 *   import { toJsonModule } from "@ulu/vite-plugin-virtual-modules";
 * 
 *   export default async function(id) {
 *     const result = await fetch("https://cms.com/api/authors/");
 *     const authors = await result.json();
 *     // Do stuff to get content and return JSON
 *     return createJsonModule(authors);
 *   }
 * @returns {Object} Vite Plugin
 */
export default function pluginVirtualModules() {
  return {
    name: pluginName,
    resolveId(id) {
      // Prevents other plugins from messing with source module
      // see -> https://vitejs.dev/guide/api-plugin#transforming-custom-file-types
      if (suffixRegex.test(id)) {
        return virtualPrefix + id;
      }
    },
    async transform(_, id) {
      if (!suffixRegex.test(id)) {
        return;
      }
      try {
        const module = await import(/* @vite-ignore */cacheBustUrl(id));
        if (!module) {
          throw new Error(pluginName, "Unable to import virtual module", id);
        }
        const virtual = await module.default(id);
        if (!virtual) {
          throw new Error(pluginName, "No module returned from virtual modules (create)", id);
        }
        return resolveArgs(virtual)
      } catch (error) {
        console.error(error);
      }
    },
  }
}
/**
 * Inserts qeuery to the end of module if to prevent node js module caching
 */
function cacheBustUrl(id) {
 return id + `&__killcache=${ Date.now() }`;
}
/**
 * Make the user's module output conform to transform API {code, map}
 * - Since they can return a string or {code, map}
 */
function resolveArgs(virtual) {
  const type = typeof virtual;
  let map = null;
  let code;
  // Allow user to pass string or object form 
  if (type === "string") {
    code = virtual;
  } else if (type === "object") {
    map = virtual?.map || null;
    code = virtual.code;
  } else {
    throw new Error(pluginName, "Virtual module (create) returned unknown type, should be string/object {code,map}");
  }
  return { code, map };
}
/**
 * Takes serializable data and converts it into ES Module that stores data as JSON
 * - The data is the default output of the new module
 * @param {Object} data Data to convert to JSON in ES module
 * @returns {String} String version of ES Module
 * @example What the returned module looks like
 *   export default JSON.parse(...)
 */
export function toJsonModule(data) {
  return `export default JSON.parse('${ JSON.stringify(data) }')`;
}