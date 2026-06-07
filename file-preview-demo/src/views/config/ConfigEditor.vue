<template>
  <div class="config-editor-container">
    <iframe
      src="http://localhost:3000/config-editor.html"
      frameborder="0"
      class="config-iframe"
      allow="clipboard-read; clipboard-write"
    />
  </div>
</template>

<script setup>
</script>

<style scoped>
.config-editor-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.config-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
