<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean
  title: string
  description: string
  confirmLabel: string
  busy?: boolean
  disabled?: boolean
}>(), { busy: false, disabled: false })
const emit = defineEmits<{ 'update:open': [value: boolean], 'confirm': [] }>()
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :description="description"
    @update:open="value => { if (!busy) emit('update:open', value) }"
  >
    <template #body>
      <slot />
      <div class="mt-4 flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          :disabled="busy"
          @click="emit('update:open', false)"
        />
        <UButton
          :label="confirmLabel"
          color="error"
          :loading="busy"
          :disabled="disabled"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>
