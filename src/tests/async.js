import { toJsonModule } from "../../index.js";

export default function() {
  return {
    async load() {
      try {
        const result = await fetch("https://jsonplaceholder.org/users");
        const users = await result.json();
        return toJsonModule(users);
      } catch (error) {
        console.log(error);
      }
    }
  }
}