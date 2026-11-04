<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { user, signOut } = useAuth()
const { busy, mutate } = useMutation()
const name = computed(() => user.value?.name || 'Microsoft account')
const email = computed(() => user.value?.email || user.value?.username)
const initials = computed(() => name.value.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join('').toUpperCase())
const items = computed<DropdownMenuItem[][]>(() => [[{
  label: name.value,
  type: 'label',
  slot: 'account'
}], [{
  label: 'Sign out',
  icon: 'i-lucide-log-out',
  disabled: busy.value,
  onSelect: logout
}]])

async function logout() {
  await mutate(signOut, 'Signed out')
}
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'end', sideOffset: 8 }"
    :modal="false"
    :ui="{ content: 'w-64 max-w-[calc(100vw-2rem)]', label: 'p-0' }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      class="gap-2 px-2 py-1.5"
      :aria-label="`Account menu for ${name}`"
      :loading="busy"
      :disabled="busy"
    >
      <span
        class="flex size-8 shrink-0 items-center justify-center rounded-md border border-default text-xs font-semibold text-primary"
        aria-hidden="true"
      >{{ initials }}</span>
      <span class="hidden min-w-0 text-left sm:block lg:hidden xl:block">
        <span class="block max-w-36 truncate text-xs leading-4 font-medium text-highlighted">{{ name }}</span>
        <span
          v-if="email"
          class="block max-w-36 truncate text-[11px] leading-4 font-normal text-muted"
        >{{ email }}</span>
      </span>
      <UIcon
        name="i-lucide-chevron-down"
        class="size-3.5 shrink-0 text-dimmed"
      />
    </UButton>

    <template #account>
      <div class="min-w-0 px-3 py-2.5">
        <p class="text-sm font-medium break-words text-highlighted">
          {{ name }}
        </p>
        <p
          v-if="email"
          class="mt-1 text-xs font-normal break-all text-muted"
        >
          {{ email }}
        </p>
      </div>
    </template>
  </UDropdownMenu>
</template>
