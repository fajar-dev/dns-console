<script setup lang="ts">
import { signInErrors } from '~/constants/auth'

const route = useRoute()
const { session } = useAuth()
const loading = ref(false)
useHead({ htmlAttrs: { class: 'login-viewport' }, bodyAttrs: { class: 'login-viewport' } })
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
  <main
    :data-login-error="!session?.authConfigured || !!error ? '' : undefined"
    class="relative h-dvh overflow-hidden bg-default"
  >
    <header
      data-login-part="header"
      class="absolute inset-x-0 top-0 z-10 flex h-16 items-center md:h-20 justify-between px-6 sm:px-10 lg:px-12"
    >
      <div class="flex items-center gap-2.5 text-highlighted">
        <UIcon
          name="i-lucide-orbit"
          class="size-7 text-primary"
        />
        <span class="text-base font-semibold tracking-tight">DNS Console</span>
      </div>
      <UColorModeButton />
    </header>

    <div
      data-login-part="layout"
      class="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] pt-16 md:grid-cols-2 md:grid-rows-1 md:pt-0"
    >
      <section
        data-login-part="intro"
        class="relative flex min-h-0 flex-col overflow-hidden border-b border-default px-6 py-3 sm:px-10 md:border-r md:border-b-0 md:pt-28 md:pb-8 lg:px-12 lg:pt-32 lg:pb-10 xl:px-16"
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

        <div class="relative z-1 shrink-0">
          <p
            data-login-part="eyebrow"
            class="mb-3 text-xs font-semibold tracking-[0.18em] text-primary uppercase"
          >
            Connect. Route. Control.
          </p>
          <h2 class="text-3xl leading-[1.08] font-semibold tracking-tight text-highlighted md:text-5xl xl:text-6xl">
            Your network,<br>
            <span class="text-primary">connected.</span>
          </h2>
          <p
            data-login-part="summary"
            class="mt-3 max-w-sm text-xs leading-5 text-muted md:mt-5 md:text-sm md:leading-7"
          >
            DNS, tunnels, and every change in between.<br class="hidden sm:block">
            All the control you need, in one place.
          </p>
        </div>

        <div
          data-login-part="illustration"
          class="relative mx-auto flex min-h-0 w-full max-w-md flex-1 items-center justify-center py-2 md:py-4"
          aria-hidden="true"
        >
          <LoginNetworkIllustration />
        </div>

        <div
          data-login-part="features"
          class="relative mt-3 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t border-primary/15 pt-3 text-[11px] text-toned md:mt-0 md:gap-x-6 md:gap-y-3 md:pt-5 md:text-xs"
        >
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

      <div
        data-login-part="form"
        class="flex min-h-0 items-center px-6 py-3 sm:px-12 md:py-12 lg:pt-28 lg:pb-16"
      >
        <section
          class="mx-auto w-full max-w-sm"
          aria-labelledby="login-title"
        >
          <span
            data-login-part="fingerprint"
            class="mb-4 inline-flex text-primary md:mb-7"
          >
            <UIcon
              name="i-lucide-fingerprint"
              class="size-6 md:size-9"
            />
          </span>
          <div
            data-login-part="heading"
            class="mb-4 md:mb-7"
          >
            <h1
              id="login-title"
              class="text-2xl font-semibold tracking-tight text-highlighted md:text-3xl"
            >
              Welcome back.
            </h1>
            <p
              data-login-part="description"
              class="mt-2 text-xs leading-5 text-muted md:mt-3 md:text-sm md:leading-6"
            >
              Your network is one sign-in away. Continue with your organization’s Microsoft account.
            </p>
          </div>
          <div
            v-if="!session?.authConfigured || error"
            role="alert"
            data-login-part="error"
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
          <p
            data-login-part="policy"
            class="mt-3 flex items-start gap-2 text-[11px] leading-4 text-muted md:mt-5 md:text-xs md:leading-5"
          >
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

<style scoped>
:global(html.login-viewport),
:global(body.login-viewport) {
  overflow: hidden;
  overscroll-behavior: none;
}

@media (height < 760px) {
  [data-login-part="header"] {
    height: 4rem;
  }
  [data-login-part="layout"] {
    padding-top: 4rem;
  }
  [data-login-part="intro"] {
    padding-top: 1rem;
    padding-bottom: 1rem;
  }
  h2 {
    font-size: 2.25rem;
  }
  [data-login-part="summary"] {
    margin-top: 0.75rem;
    font-size: 0.75rem;
    line-height: 1.25rem;
  }
  [data-login-part="features"] {
    gap: 0.5rem 1rem;
    padding-top: 0.75rem;
    font-size: 0.6875rem;
  }
  [data-login-part="form"] {
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
  }
  [data-login-part="fingerprint"] {
    margin-bottom: 1rem;
  }
  [data-login-part="fingerprint"] span {
    width: 1.5rem;
    height: 1.5rem;
  }
  [data-login-part="heading"] {
    margin-bottom: 1rem;
  }
  [data-login-part="description"] {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    line-height: 1.25rem;
  }
  [data-login-part="policy"] {
    margin-top: 0.75rem;
    font-size: 0.6875rem;
    line-height: 1rem;
  }
  [data-login-part="error"] {
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    font-size: 0.75rem;
    line-height: 1.125rem;
  }
}

@media (width < 768px) {
  [data-login-part="illustration"] :deep(svg) {
    max-height: 8rem;
  }
}

@media (width < 768px) and (height < 760px) {
  [data-login-error] [data-login-part="layout"] {
    grid-template-rows: minmax(0, 1fr) minmax(0, 2fr);
  }
  [data-login-part="eyebrow"],
  [data-login-error] [data-login-part="summary"],
  [data-login-error] [data-login-part="features"],
  [data-login-error] [data-login-part="fingerprint"],
  [data-login-error] [data-login-part="description"] {
    display: none;
  }
  h2 {
    font-size: 1.75rem;
  }
  [data-login-part="illustration"] :deep(svg) {
    max-height: 5rem;
  }
}

@media (width < 768px) and (height < 600px) {
  [data-login-part="summary"],
  [data-login-part="features"],
  [data-login-part="description"],
  [data-login-part="fingerprint"] {
    display: none;
  }
  [data-login-part="header"] {
    height: 3.5rem;
  }
  [data-login-part="layout"] {
    padding-top: 3.5rem;
  }
  [data-login-part="intro"] {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
  h1 {
    font-size: 1.5rem;
    line-height: 1.75rem;
  }
  h2 {
    font-size: 1.5rem;
    line-height: 1.625rem;
  }
  [data-login-part="illustration"] :deep(svg) {
    max-height: 4rem;
  }
}

@media (height < 450px) {
  [data-login-part="header"] {
    height: 3.5rem;
  }
  [data-login-part="layout"] {
    padding-top: 3.5rem;
  }
  h1 {
    font-size: 1.5rem;
    line-height: 1.75rem;
  }
  [data-login-part="heading"] {
    margin-bottom: 0.75rem;
  }
  [data-login-part="policy"] {
    margin-top: 0.5rem;
    font-size: 0.625rem;
    line-height: 0.875rem;
  }
}

@media (width < 768px) and (height < 450px) and (orientation: landscape) {
  [data-login-part="layout"],
  [data-login-error] [data-login-part="layout"] {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
  }
  [data-login-part="intro"] {
    border-right-width: 1px;
    border-bottom-width: 0;
  }
  [data-login-part="illustration"] :deep(svg) {
    max-height: 6rem;
  }
  [data-login-part="form"] {
    padding-right: 1rem;
    padding-left: 1rem;
  }
  [data-login-part="heading"] {
    margin-bottom: 0.5rem;
  }
  [data-login-part="error"] {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    font-size: 0.6875rem;
    line-height: 1rem;
  }
  [data-login-part="policy"] {
    margin-top: 0.5rem;
    font-size: 0.625rem;
    line-height: 0.875rem;
  }
}
</style>
