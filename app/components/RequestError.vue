<script setup lang="ts">
defineProps<{ error: unknown }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <UAlert
    color="error"
    variant="soft"
    icon="i-lucide-circle-alert"
    title="Unable to load data"
    :description="consoleError(error)"
    :actions="[{ label: 'Try again', color: 'error', variant: 'outline', onClick: () => $emit('retry') }]"
  />
</template>
