<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const props = withDefaults(defineProps<{
  label: string
  disabled?: boolean
  editDisabled?: boolean
}>(), { disabled: false, editDisabled: false })
const emit = defineEmits<{ edit: [], delete: [] }>()
const items = computed<DropdownMenuItem[][]>(() => [[{
  label: 'Edit',
  icon: 'i-lucide-pencil',
  disabled: props.disabled || props.editDisabled,
  onSelect: () => emit('edit')
}], [{
  label: 'Delete',
  icon: 'i-lucide-trash-2',
  color: 'error',
  disabled: props.disabled,
  onSelect: () => emit('delete')
}]])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'end', sideOffset: 6 }"
    :modal="false"
    :ui="{ content: 'min-w-36' }"
  >
    <UButton
      icon="i-lucide-ellipsis-vertical"
      color="neutral"
      variant="ghost"
      :aria-label="`Actions for ${label}`"
      :disabled="disabled"
    />
  </UDropdownMenu>
</template>
