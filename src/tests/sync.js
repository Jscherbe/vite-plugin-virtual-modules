// Test the basic API
import { toJsonModule } from "../../index.js";

export default function() {
  return {
    load() {
      return toJsonModule({ msg: "Hello Worldc 9" });
    }
  }
}