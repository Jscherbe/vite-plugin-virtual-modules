// Tests manually triggering the dynamic module to reload

import { toJsonModule } from "../../index.js";

let count = 0;

export default function({ reload, isServe }) {
  if (isServe) {
    setTimeout(() => {
      count++;
      console.log('RELOAD -- sync-reload');
      reload();
    }, 5000);
  }

  return {
    load() {
      return toJsonModule({ msg: `Count: ${ count }` });
    }
  }
}