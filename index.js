import url from "url";
import path from "path";
import chokidar from "chokidar";

let server;
const virtualPrefix = '\0';
const filesChanged = new Set();
const watchers = new Map();
const fileWatchers = new Map();
const pluginName = '@ulu/vite-plugin-virtual-modules';
const defaults = {
  suffix: /\?virtual-module(&.*)*$/,
  watchEvents: ["add", "unlink", "change", "unlinkDir", "addDir"]
};

/**
 * Vite plugin to convert normal js file into server side loaded JSON
 * @param {Object} config Configuraton object
 * @param {Regex} config.suffix Regex to match files (default is "?virtual-module")
 * @param {Regex} config.watchEvents Events that should trigger file watch reload
 * @returns {Object} Vite Plugin
 */
export default function pluginVirtualModules(config) {
  const opts = Object.assign({}, defaults, config);
  return {
    name: pluginName,
    configureServer(_server) {
      server = _server;
    },
    resolveId(id) {
      if (opts.suffix.test(id)) return vid(id);
    },
    async load(id) {
      if (!opts.suffix.test(id)) return;
      try {
        // Close watchers from previous loads
        cleanupWatchers(watchers, id);
        cleanupWatchers(fileWatchers, id);
        
        // Reload is used internally and by user programmatically if needed
        const reload = async () => {
          const mod = await server.moduleGraph.getModuleById(id);
          if (mod) {
            server.reloadModule(mod);
          }
        };
        const queries = url.parse(id, true)?.query;
        const ctx = { id, queries, reload };
        const modulePath = id.split("?")[0];
        
        const watcher = chokidar.watch(modulePath);
        watchers.set(id, watcher);
        watcher.on("change", () => {
          filesChanged.add(id);
          reload();
        });
        
        // If this was triggered by file change to the loader, reload the module 
        // in node using cache busting query
        let moduleUrl = id;
        if (filesChanged.has(id)) {
          moduleUrl = cacheBustUrl(id);
          filesChanged.delete(id);
        }

        // Load the users module
        const module = await import(/* @vite-ignore */moduleUrl);
        if (!module) {
          throw new Error(pluginName, "Unable to import virtual module", id);
        }
        const loader = await module.default(ctx);
        if (!loader) {
          throw new Error(pluginName, "No module returned from virtual modules (create)", id);
        }
        if (!loader.load) {
          throw new Error(pluginName, "Virtual module should return an object with load() method", id);
        }

        // Check if the loader has watch option set
        // if so setup up file watcher, and wait for ready event
        let watchedFiles;
        if (loader.watch) {
          watchedFiles = new Promise((resolve, reject) => {
            const fileWatcher = chokidar.watch(loader.watch, { 
              cwd: path.dirname(id),
              ignoreInitial: true
            });
            fileWatcher.on("all", (event) => {
              if (opts.watchEvents.includes(event)) {
                reload();
              }
            });
            fileWatcher.on("ready", () => {
              const files = fileWatcher.getWatched();
              resolve(toFilesArray(files));
            });
            fileWatcher.on("error", (error) => {
              reject(new Error(`File watcher error: ${ error }`));
            })
          }); 
        }
        
        // Load the virtual module using the user's load method
        // - if they were watching files we wait and pass them
        let result;
        if (watchedFiles) {
          result = await loader.load(await watchedFiles);
        } else {
          result = await loader.load();
        }
        
        return result;
      } catch (error) {
        console.error(error);
      }
    },
  }
}

/**
 * Create array of relative paths from chokidar object (getWatched)
 * @return {Array} Files
 */
function toFilesArray(watched) {
  return Object
    .entries(watched)
    .reduce((acc, [dir, files]) => {
      files.forEach(file => {
        // Since we use cwd, "." is the cwd, everything else is the subpath
        acc.push(dir === "." ? file : `${ dir }/${ file }`);
      })
      return acc;
    }, [])
    .sort();
}
function cleanupWatchers(map, id) {
  if (map.has(id)) {
    map.get(id).close();
    map.delete(id);
  }
}
/**
 * Prevents other plugins from messing with source module
 * @see https://vitejs.dev/guide/api-plugin#transforming-custom-file-types
 */
function vid(id) {
  return virtualPrefix + id;
}
/**
 * Inserts qeuery to the end of module if to prevent node js module caching
 */
function cacheBustUrl(id) {
 return id + `&__killcache=${ Date.now() }`;
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