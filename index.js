import url from "url";
import path from "path";
import chokidar from "chokidar";

let server;
let config;
let isServe;

const virtualPrefix = '\0';
const importPaths = new Map();
const moduleWatchers = new Map();
const fileWatchers = new Map();
const pluginName = '@ulu/vite-plugin-virtual-modules';
const defaults = {
  suffix: /\?virtual-module(&.*)*$/,
  watchEvents: ["add", "unlink", "change", "unlinkDir", "addDir"],
  watchOptions: {}
};

/**
 * Vite plugin to convert normal js file into server side loaded JSON
 * @param {Object} options Configuraton object
 * @param {Regex} options.suffix Regex to match files (default is "?virtual-module")
 * @param {Regex} options.watchEvents Events that should trigger file watch reload, can also be set on loader
 * @param {Regex} options.watchOptions Option to be passed to chokidar library for watching, can also be set on loader
 * @returns {Object} Vite Plugin
 */
export default function pluginVirtualModules(options) {
  const opts = Object.assign({}, defaults, options);
  return {
    name: pluginName,
    configureServer(_server) {
      server = _server;
    },
    configResolved(_config) {
      config = _config;
      isServe = config.command === "serve";
    },
    async closeBundle() {
      cleanupAllWatchers(moduleWatchers);
      cleanupAllWatchers(fileWatchers);
    },
    resolveId(id) {
      if (opts.suffix.test(id)) {
        return prefixId(id);
      }
    },
    async load(id) {
      if (!opts.suffix.test(id)) return;
      try {
        const ctx = createContext(id);
        cleanupWatcher(moduleWatchers, id);
        cleanupWatcher(fileWatchers, id);
        setupModuleWatcher(ctx);
        // Load the user's module (the path in the ID)
        // Then call the user's function (default method) passing them the 
        // context, so they can do what ever they need to do with that information
        // and then they return the loader configuration object (ie. load, watch, etc)
        const loader = await importLoader(ctx);
        // Load the virtual module using the user's load method
        // if they were watching files we wait and pass them
        return await loader.load(await setupWatchedFiles(ctx, opts, loader));
      } catch (error) {
        console.error(error);
      }
    },
  }
}

/**
 * Check if the loader has watch option set if so setup up file watcher, 
 * and wait for ready event
 * @param {Object} ctx Context object
 * @param {Object} opts Options
 * @param {Object} loader Users loader options
 * @returns {Promise} Returns a list of watched files (flat array) once resolved
 */
function setupWatchedFiles(ctx, opts, loader) {
  const { id, reload } = ctx;
  if (!loader.watch) {
    return Promise.resolve([]);
  }
  return new Promise((resolve, reject) => {
    const watchOpts = { cwd: path.dirname(id) };
    const reqOpts = { ignoreInitial: true };

    // Either loader or global plugin opts 
    const userOpts = loader.watchOptions ? loader.watchOptions : opts.watchOptions;
    const watchEvents = loader.watchEvents || opts.watchEvents;
    Object.assign(watchOpts, userOpts, reqOpts);
    
    const watcher = chokidar.watch(loader.watch, watchOpts);
    fileWatchers.set(id, watcher);

    watcher.on("all", (event) => {
      if (watchEvents.includes(event)) {
        reload();
      }
    });
    watcher.on("ready", () => {
      const files = watcher.getWatched();
      resolve(toFilesArray(files));
    });
    watcher.on("error", (error) => {
      reject(new Error(`File watcher error: ${ error }`));
    });
  }); 
}

/**
 * Load the user's module and then call the default 
 * function to return the loader object
 * @param {Object} ctx Context
 * @returns {Object} Loader config
 */
async function importLoader(ctx) {
  const { id, importPath } = ctx;
  const module = await import(/* @vite-ignore */importPath);
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
  return loader;
}

/**
 * Setup the watcher that watches the user's module for changes
 * @param {Object} ctx Context object
 * @returns 
 */
function setupModuleWatcher(ctx) {
  if (!isServe) return;
  const { id, reload, filePath } = ctx;
  const watcher = chokidar.watch(filePath);
  moduleWatchers.set(id, watcher);
  watcher.on("change", () => {
    // Set the new path to load the node module from that includes the 
    // cachekill query, which will force node to load this as a new module
    // instead of grabbing the current cached one. This is put into a lookup
    // so that it can be the new url/path to the node module from this point forward.
    // This way if a user reloads the module using the reload() they will get the current 
    // running/cached version of their module
    importPaths.set(id, cacheBustUrl(id));
    reload();
  });
}

/**
 * Create the context object
 * @param {String} id Module id
 * @returns {Object} Context object that is used internally for the module and passed to user
 */
function createContext(id) {
  // If this was triggered by file change to the loader, reload the module 
  // in node using cache busting query
  let importPath = id;
  if (importPaths.has(id)) {
    importPath = importPaths.get(id);
  }
  return {
    id,
    isServe,
    importPath,
    command: config.command,
    filePath: id.split("?")[0],
    queries: url.parse(id, true)?.query,
    reload: async () => {
      if (!isServe) return;
      const mod = await server?.moduleGraph?.getModuleById(id);
      if (mod) {
        server.reloadModule(mod);
      }
    }
  };
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

/**
 * Close watchers from previous loads
 * @param {Map} map Map to search through 
 * @param {String} id Module id
 */
function cleanupWatcher(map, id) {
  if (map.has(id)) {
    map.get(id).close();
    map.delete(id);
  }
}

/**
 * Close all chokidar watchers for a given map
 * @param {Map} map Map to remove all watchers from
 */
function cleanupAllWatchers(map) {
  for (const watcher of map.values()) {
    watcher.close();
  }
  map.clear();
}

/**
 * Prevents other plugins from messing with source module
 * @see https://vitejs.dev/guide/api-plugin#transforming-custom-file-types
 */
function prefixId(id) {
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