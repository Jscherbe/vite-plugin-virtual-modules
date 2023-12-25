// Tests watching other files to trigger the reload of virtual module
import { readFileSync } from "fs";
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { toJsonModule } from "../../index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function() {
  return {
    // watch: ["watched/**/*.txt"],
    watch: ["watched/**/*.txt"],
    load(watchedFiles) {
      const messages = [];
      watchedFiles.forEach(relPath => {
        const filePath = resolve(__dirname, relPath);
        const file = readFileSync(filePath);
        messages.push(file.toString());
      });

      return toJsonModule({ messages });
    }
  }
}
