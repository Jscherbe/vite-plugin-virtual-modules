# Dev Notes

## Memory Leaks / Performance

- Do we need to worry about the module instances
  - When we cachebust we are saving a new module to the registry
  - The old module will still exist
    - ES modules don't have any method of garbage collection, all modules will stay alive in the registry until the process is restarted and the registry is rebuilt
    - I don't think this is an issue for development of small modules but for larger/many modules maybe having the save watch cache bust will be an issue
    - [See](https://github.com/nodejs/help/issues/2806)
    - [See](https://esdiscuss.org/topic/are-es-modules-garbage-collected-if-so-do-they-re-execute-on-next-import)
    - Should probably wait and see if there are issues after using this for some time
    - May be able to setup a test to measure memory usage as new modules are added over and over
      - Test something extreme (make a module every 300ms or something with a large dataset)
      - Run for 10mins and see how memory is effected

## Working on watch option

- Decide if what watch means (is this only change?) or add remove, etc
  - I think 'all' and then we should pass details to user
  - Or maybe this should be kept simple?
  - Should the user be able to pass options to chokidar
    - For advanced use cases the user can always build this inside their module and use reload
      so this watch option should be pretty basebones (files/dirs add/remove/edit) will trigger load
      - Load recieves details
  - Look at 
    - https://github.com/vuejs/vitepress/blob/bddf74e379e4d8a60c7bc3875784384415e12546/src/node/plugins/staticDataPlugin.ts#L126
  

## How to Reload a Module

- https://github.com/vitejs/vite/pull/10333
  - (using reloadModule) https://github.com/vitejs/vite/blob/19e3c9a8a16847486fbad8a8cd48fc771b1538bb/playground/hmr/vite.config.ts#L51


## Thinking through API so that update can happen

- Need a way to watch
- Need a way to override
- Should support the old syntax?
  - Allow export default to be either:
    - Function = Static can't invalidate/update
    - Object
      - load = Load the module for the first time or if a watched file changes
      - watch = Attach a watcher to files to trigger update via calling load again
        - User can use internal logic if they need to change the behavior of load on update
- Allow the user to return either string (module) or { map, code } for transform API?

### Flow

- Module requested
- Plugin intercepts the request
- Loads the users module to be used dynamically
- Calls the load() method
  - User code emits module source
- Source code is passed to vite in transform
- Something changes
  - A file that the dynamic module uses has changed (watch)
    - Solution: Add watch option
      - Should reload the user's module when a file changes
      - Should pass the user the matching file(s)
  - Content is updated on the server (?)
    - User would be responsible for triggering the reload
    - User would need to be able to call the reload method

### Final API

- Export default function for simplicity in getting the creation module
- Could support original static API (ie. Just return string)
- Allows the watch option to be set conditionally based on parameters (queries, etc)

```js
/** 
 * Function that creates the virtaul module
 * @param {Object} context Context object
 * @param {String} context.id The module's id (path from import)
 * @param {Object} context.queries Object of queries if there were any (url queries on path from import)
 * @param {Function} context.reload Function to trigger a reload of the virtual module
 */
export default function({ id, queries, reload }) {
  return {
    /**
     * Passed to chokidar
     */
    watch: ["some/content.md"],
    /**
     * Function called to create the module (initially or by reload())
     */
    load(files) {

    }
  }
}
```

### API Scratchsheet

```js
export default function() {
  return toJsonModule({ msg: dep() })
}

export default function(id, { reload }) {
  return {
    watch: ["./virtual-dep.js"],
    load() {
      return "module..."
    }
  }
}

export default {
  watch: ["./virtual-dep.js"],
  load(id, { reload }) {
    return ...;
  }
}

export default function(id) {
  return module;
}

export default function(id, { reload }) {
  return {
    watch: [],
    load(files) {

    }
  }
}

export default {
  watch: ["./virtual-dep.js"],
  load({ id, files, reload }) {
    return ...;
  }
}
export default function(id, { reload }) {
  return {
    watch: ["./virtual-dep.js"],
    load() {
      return "module..."
    }
  }
}


export default function(id) {
  return {
    watch: ["./virtual-dep.js"],
    load(id, { invalidate, update }) {
      
    }
  }
}

export default {
  watch: ["./virtual-dep.js"],
  load(_watchedFiles) {
    return toJsonModule({ msg: dep() });
  }
}

```