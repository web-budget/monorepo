<script setup lang="ts">
const version = __APP_VERSION__
</script>

<template>
  <footer class="text-muted-foreground border-t px-4 py-3 text-center text-sm">
    <a
      href="https://webbudget.com.br"
      target="_blank"
      rel="noopener noreferrer"
      class="text-foreground font-semibold hover:underline"
    >
      webBudget
    </a>
    v{{ version }}
  </footer>
</template>
