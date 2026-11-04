<script setup lang="ts">
import { links } from '~/constants/navigation'

const route = useRoute()
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-muted bg-default pb-[env(safe-area-inset-bottom)] lg:hidden"
    aria-label="Mobile navigation"
  >
    <div class="mx-auto grid h-16 max-w-md grid-cols-4 px-2">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        :aria-label="link.label"
        :aria-current="route.path === link.to ? 'page' : undefined"
        class="relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-[11px] transition-colors outline-offset-[-4px] focus-visible:outline-2 focus-visible:outline-primary"
        :class="route.path === link.to ? 'font-semibold text-primary after:absolute after:inset-x-7 after:top-0 after:h-0.5 after:rounded-b-md after:bg-primary' : 'font-medium text-muted hover:text-highlighted'"
      >
        <UIcon
          :name="link.icon"
          class="size-5"
        />
        <span>{{ link.mobileLabel }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
