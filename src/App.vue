<script setup>
  import virtualMessageSync from "./test-sync.js?virtual-module";
  import users from "./test-async.js?virtual-module";
  console.log(users);
</script>

<template>
  Tests
  <p>
    {{ virtualMessageSync }}
  </p>
  <p>
    {{ users.length }}
  </p>
</template>
