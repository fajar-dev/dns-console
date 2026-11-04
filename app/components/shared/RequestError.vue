<script setup lang="ts">
import { getErrorMessage } from '~/utils/error-message'

defineProps<{ error: unknown }>()
</script>

<template>
  <UAlert
    color="error"
    variant="soft"
    icon="i-lucide-circle-alert"
    title="Unable to load data"
    :description="getErrorMessage(error)"
  />
</template>
