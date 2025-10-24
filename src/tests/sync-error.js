// Test the basic API
import { toJsonModule } from "../../index.js";

export default function() {
  return {
    load() {
      const obj = {};
      const causeError = obj.something.result * 3;
      return toJsonModule({ msg: "Hello World 12" });
    }
  }
}