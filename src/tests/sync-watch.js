// Tests watching other files to trigger the reload of virtual module
import { readFileSync } from "fs";
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { toJsonModule } from "../../index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function({ queries }) {
  return {
    // watch: ["watched/**/*.txt"],
    watch: ["watched/**/*.txt"],
    load({ watchedFiles, data }) {

      console.log("-- SYNC WATCH -- LOAD()");

      // To test this loader with multiple types (query / non-query)
      if (queries.mode === "count") {
        // console.log("Sync Watch Query Version", watchedFiles.length);
        return `export default ${ watchedFiles.length };`;
      } else {
        // console.log("Sync Watch Full Version");
      }

      const messages = [];
      watchedFiles.forEach(relPath => {
        const filePath = resolve(__dirname, relPath);
        const file = readFileSync(filePath);
        messages.push(file.toString());
      });

      return toJsonModule({ messages, lastEvent: data });
    }
  }
}
