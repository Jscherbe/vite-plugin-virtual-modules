import { toJsonModule } from "../index.js";

export default async function() {
  try {
    const result = await fetch("https://jsonplaceholder.org/users");
    const users = await result.json();
    return toJsonModule(users);
  } catch (error) {
    console.log(error);
  }
}