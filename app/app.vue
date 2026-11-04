<script setup lang="ts">
const route = useRoute()
const menuOpen = ref(false)
const links = [
  { label: 'DNS records', icon: 'i-lucide-globe', to: '/' },
  { label: 'Tunnels & routes', icon: 'i-lucide-network', to: '/tunnels' },
  { label: 'Logs', icon: 'i-lucide-logs', to: '/logs' },
  { label: 'Configuration', icon: 'i-lucide-settings-2', to: '/settings' }
]
watch(() => route.path, () => {
  menuOpen.value = false
})
useHead({ htmlAttrs: { lang: 'en' }, title: 'DNS Console', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
const { busy, mutate } = useConsole()
async function logout() {
  if (await mutate(() => $fetch('/api/auth/logout', { method: 'POST', body: {} }), 'Signed out')) await navigateTo('/login')
}
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator
      color="var(--ui-primary)"
      :height="2"
      :throttle="0"
    />
    <NuxtPage v-if="route.path === '/login'" />
    <div
      v-else
      class="flex min-h-screen flex-col bg-default"
    >
      <header class="sticky top-0 z-40 border-b border-muted bg-default">
        <div class="mx-auto flex h-16 max-w-7xl items-center gap-8 px-5 sm:px-8">
          <NuxtLink
            to="/"
            class="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="DNS Console home"
          >
            <UIcon
              name="i-lucide-orbit"
              class="size-7 text-primary"
            />
            <span class="text-base font-semibold tracking-tight">DNS Console</span>
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
              class="relative flex h-full items-center gap-2 px-3 text-sm transition-colors hover:text-highlighted focus-visible:outline-2 focus-visible:outline-primary"
              :class="route.path === link.to ? 'text-highlighted after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary' : 'text-muted'"
            >
              {{ link.label }}
            </NuxtLink>
          </nav>
          <div class="ml-auto flex items-center gap-1 sm:gap-2">
            <UColorModeButton />
            <UButton
              icon="i-lucide-log-out"
              color="neutral"
              variant="ghost"
              aria-label="Sign out"
              :loading="busy"
              @click="logout"
            />
            <UButton
              :icon="menuOpen ? 'i-lucide-x' : 'i-lucide-menu'"
              color="neutral"
              variant="ghost"
              :aria-label="menuOpen ? 'Close navigation' : 'Open navigation'"
              :aria-expanded="menuOpen"
              aria-controls="mobile-navigation"
              class="lg:hidden"
              @click="menuOpen = !menuOpen"
            />
          </div>
        </div>
        <nav
          v-if="menuOpen"
          id="mobile-navigation"
          class="grid grid-cols-2 gap-1 border-t border-default p-3 lg:hidden"
          aria-label="Mobile navigation"
        >
          <UButton
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            :label="link.label"
            :icon="link.icon"
            :aria-current="route.path === link.to ? 'page' : undefined"
            :variant="route.path === link.to ? 'soft' : 'ghost'"
            :color="route.path === link.to ? 'primary' : 'neutral'"
            class="justify-start py-3"
          />
        </nav>
      </header>
      <main class="mx-auto w-full max-w-7xl flex-1 px-5 py-10 sm:px-8 sm:py-12">
        <NuxtPage />
      </main>
    </div>
  </UApp>
</template>
