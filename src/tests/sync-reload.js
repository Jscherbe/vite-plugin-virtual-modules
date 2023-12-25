// Tests manually triggering the dynamic module to reload

import { toJsonModule } from "../../index.js";

let count = 0;

export default function({ reload }) {

  setTimeout(() => {
    count++;
    reload();
  }, 5000);

  return {
    load() {
      return toJsonModule({ msg: `Count: ${ count }` });
    }
  }
}