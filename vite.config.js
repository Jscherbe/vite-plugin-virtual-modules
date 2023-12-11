import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

import virtualModules from "./index.js";

export default defineConfig({
  plugins: [
    virtualModules(),
    vue(),
  ],
})
