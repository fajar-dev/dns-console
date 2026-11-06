<script setup lang="ts">
import { links } from '~/constants/navigation'

const route = useRoute()
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-muted bg-default">
    <div class="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-5 sm:gap-4 sm:px-8">
      <NuxtLink
        to="/"
        class="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-primary"
        aria-label="DNS Console home"
      >
        <UIcon
          name="i-lucide-orbit"
          class="size-7 text-primary"
        />
        <span class="hidden text-base font-semibold tracking-tight sm:inline">DNS Console</span>
      </NuxtLink>
      <nav
        class="hidden h-full items-center gap-1 lg:flex"
        aria-label="Main navigation"
      >
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :aria-current="route.path === link.to ? 'page' : undefined"
          class="relative flex h-full items-center gap-2 px-2 text-sm transition-colors hover:text-highlighted focus-visible:outline-2 focus-visible:outline-primary"
          :class="route.path === link.to ? 'text-highlighted after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary' : 'text-muted'"
        >
          <UIcon
            :name="link.icon"
            class="size-4 shrink-0"
          />
          {{ link.label }}
        </NuxtLink>
      </nav>
      <div class="ml-auto flex items-center gap-1 sm:gap-2">
        <UColorModeButton />
        <UserAccountMenu />
      </div>
    </div>
  </header>
</template>
