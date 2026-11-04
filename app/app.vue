<script setup lang="ts">
const route = useRoute()
useHead({
  htmlAttrs: { lang: 'en' },
  title: 'DNS Console',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
  ]
})
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
      class="flex min-h-dvh flex-col bg-default"
    >
      <AppHeader />
      <main class="mx-auto w-full max-w-[1440px] flex-1 px-5 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-8 sm:pt-8 lg:pb-12">
        <NuxtPage />
      </main>
      <AppMobileNavigation />
    </div>
  </UApp>
</template>
