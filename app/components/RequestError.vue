<script setup lang="ts">
defineProps<{ error: unknown }>()
</script>

<template>
  <UAlert
    color="error"
    variant="soft"
    icon="i-lucide-circle-alert"
    title="Unable to load data"
    :description="consoleError(error)"
  />
</template>
