<script setup lang="ts">
import { signInErrors } from '~/constants/auth'

const route = useRoute()
const { session } = useAuth()
const loading = ref(false)
const error = computed(() => typeof route.query.error === 'string' && Object.hasOwn(signInErrors, route.query.error) ? signInErrors[route.query.error] : undefined)
async function login() {
  if (loading.value || !session.value?.authConfigured) return
  loading.value = true
  try {
    await navigateTo('/auth/microsoft', { external: true })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="relative min-h-dvh bg-default">
    <header class="absolute inset-x-0 top-0 z-10 flex h-20 items-center justify-between px-6 sm:px-10 lg:px-12">
      <div class="flex items-center gap-2.5 text-highlighted">
        <UIcon
          name="i-lucide-orbit"
          class="size-7 text-primary"
        />
        <span class="text-base font-semibold tracking-tight">DNS Console</span>
      </div>
      <UColorModeButton />
    </header>

    <div class="grid min-h-dvh lg:grid-cols-2">
      <section
        class="relative flex flex-col overflow-hidden border-b border-default px-6 pt-28 pb-8 sm:px-10 lg:min-h-dvh lg:border-r lg:border-b-0 lg:px-12 lg:pt-32 lg:pb-10 xl:px-16"
        aria-label="About DNS Console"
      >
        <svg
          class="pointer-events-none absolute inset-0 h-full w-full text-primary/[0.08]"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="login-grid"
              width="48"
              height="48"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M48 0H0V48"
                fill="none"
                stroke="currentColor"
                stroke-width="0.7"
              />
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="url(#login-grid)"
          />
        </svg>

        <div class="relative z-1">
          <p class="mb-4 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Connect. Route. Control.
          </p>
          <h2 class="text-4xl leading-[1.08] font-semibold tracking-tight text-highlighted sm:text-5xl xl:text-6xl">
            Your network,<br>
            <span class="text-primary">connected.</span>
          </h2>
          <p class="mt-5 max-w-sm text-sm leading-7 text-muted">
            DNS, tunnels, and every change in between.<br class="hidden sm:block">
            All the control you need, in one place.
          </p>
        </div>

        <div
          class="relative mx-auto hidden min-h-0 w-full max-w-md flex-1 items-center justify-center py-4 lg:flex"
          aria-hidden="true"
        >
          <LoginNetworkIllustration />
        </div>

        <div class="relative mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-primary/15 pt-5 text-xs text-toned lg:mt-0">
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-globe"
              class="size-4 text-primary"
            />DNS management</span>
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-network"
              class="size-4 text-primary"
            />Tunnel routing</span>
          <span class="flex items-center gap-2">
            <UIcon
              name="i-lucide-logs"
              class="size-4 text-primary"
            />Audit trail</span>
        </div>
      </section>

      <div class="flex items-center px-6 py-12 sm:px-12 lg:pt-28 lg:pb-16">
        <section
          class="mx-auto w-full max-w-sm"
          aria-labelledby="login-title"
        >
          <span class="mb-7 inline-flex text-primary">
            <UIcon
              name="i-lucide-fingerprint"
              class="size-9"
            />
          </span>
          <div class="mb-7">
            <h1
              id="login-title"
              class="text-3xl font-semibold tracking-tight text-highlighted"
            >
              Welcome back.
            </h1>
            <p class="mt-3 text-sm leading-6 text-muted">
              Your network is one sign-in away. Continue with your organization’s Microsoft account.
            </p>
          </div>
          <div
            v-if="!session?.authConfigured || error"
            role="alert"
            class="mb-6 flex gap-3 rounded-lg border border-error/30 p-4 text-sm leading-6 text-error"
          >
            <UIcon
              name="i-lucide-circle-alert"
              class="mt-0.5 size-5 shrink-0"
            />
            <p>{{ !session?.authConfigured ? 'Microsoft sign-in is not configured. Complete the Microsoft Entra configuration on the server to enable sign-in.' : error }}</p>
          </div>
          <UButton
            color="primary"
            variant="solid"
            block
            size="lg"
            class="min-h-12 justify-center gap-3"
            :loading="loading"
            :disabled="!session?.authConfigured"
            @click="login"
          >
            <MicrosoftLogo v-if="!loading" />
            Continue with Microsoft
          </UButton>
          <p class="mt-5 flex items-start gap-2 text-xs leading-5 text-muted">
            <UIcon
              name="i-lucide-lock-keyhole"
              class="mt-0.5 size-3.5 shrink-0"
            />
            Access is managed by Asset Monitoring Teknologi Indonesia.
          </p>
        </section>
      </div>
    </div>
  </main>
</template>
