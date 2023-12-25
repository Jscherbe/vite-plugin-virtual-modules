// Tests using queries in virtual module
import { toJsonModule } from "../../index.js";

export default function({ queries }) {
  return {
    load() {
      return toJsonModule({ msg: `Query (type) ${ queries.type }` });
    }
  }
}