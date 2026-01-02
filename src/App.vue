<script setup>
  import testSync from "./tests/sync.js?virtual-module";
  // import testSync from "./tests/sync-error.js?virtual-module";
  import testReload from "./tests/sync-reload.js?virtual-module";
  import testQuery from "./tests/sync-queries.js?virtual-module&type=dog";
  import asyncUsers from "./tests/async.js?virtual-module";
  import testWatch from "./tests/sync-watch.js?virtual-module";
  import watchCount from "./tests/sync-watch.js?virtual-module&mode=count";
  console.log("asyncUsers:\n", asyncUsers);
  console.log("testSync:\n", testSync);
  console.log("watchCount:\n", watchCount);
  
</script>

<template>
  <h1>Tests</h1>

  <h2>Sync</h2>
  <p>Should output hello world</p>
  <p>{{ testSync.msg }}</p>

  <h2>Queries</h2>
  <p>Should output type dog</p>
  <p>{{ testQuery.msg }}</p>

  <h2>Watch</h2>
  <p>This should print out a list of messages (content of watched txt files)</p>
  <ul>
    <li v-for="(msg, index) in testWatch.messages" :key="index">
      {{ msg }}
    </li>
  </ul>
  <p>Last Event: {{ testWatch.lastEvent }}</p>
  <p>Watched Files Count: {{ watchCount }}</p>

  <h2>Reload</h2>
  <p>Should count upwards as module is reloaded in timeout</p>
  <p>{{ testReload.msg }}</p>

  <h2>Async</h2>
  <p>Should output dynamic length of fetched content (users.length)</p>
  <p>{{ asyncUsers.length }}</p>

</template>
