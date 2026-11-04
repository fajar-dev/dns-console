<script setup lang="ts">
const route = useRoute()
const { data: session } = await useFetch('/api/auth/session')
const loading = ref(false)
const errors: Record<string, string> = {
  denied: 'Your Microsoft account has not been assigned access. Contact your administrator.',
  signin: 'Sign-in could not be completed. Please try again.',
  transaction: 'Your sign-in session is missing or expired. Open the app using its configured address and sign in again.',
  credentials: 'Microsoft rejected the application credentials. Check the client secret value and its expiry.',
  redirect: 'The Microsoft redirect URI does not match the application configuration.',
  verification: 'Microsoft token verification failed. Check the server authentication diagnostics.',
  unavailable: 'Microsoft sign-in is temporarily unavailable. Please try again.'
}
const error = computed(() => typeof route.query.error === 'string' && Object.hasOwn(errors, route.query.error) ? errors[route.query.error] : undefined)
async function login() {
  if (loading.value || !session.value?.authConfigured) return
  loading.value = true
  await navigateTo('/auth/microsoft', { external: true })
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-default p-6">
    <div class="w-full max-w-md">
      <div class="mb-8 flex justify-center">
        <span class="flex size-12 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary"><UIcon
          name="i-lucide-orbit"
          class="size-8"
        /></span>
      </div>
      <UCard>
        <div class="mb-7 text-center">
          <h1 class="text-2xl font-medium tracking-tight text-highlighted">
            Your network, in one place.
          </h1>
          <p class="mt-2 text-sm text-muted">
            Sign in with your organization’s Microsoft account.
          </p>
        </div>
        <UAlert
          v-if="!session?.authConfigured"
          class="mb-5"
          color="warning"
          variant="soft"
          title="Microsoft sign-in is not configured"
          description="Complete the Microsoft Entra configuration on the server to enable sign-in."
        />
        <p
          v-else-if="error"
          role="alert"
          class="mb-5 text-sm text-error"
        >
          {{ error }}
        </p>
        <UButton
          color="neutral"
          variant="outline"
          block
          size="lg"
          :loading="loading"
          :disabled="!session?.authConfigured"
          @click="login"
        >
          <svg
            v-if="!loading"
            aria-hidden="true"
            viewBox="0 0 21 21"
            class="size-4 shrink-0"
          >
            <path
              fill="#f25022"
              d="M0 0h10v10H0z"
            /><path
              fill="#7fba00"
              d="M11 0h10v10H11z"
            /><path
              fill="#00a4ef"
              d="M0 11h10v10H0z"
            /><path
              fill="#ffb900"
              d="M11 11h10v10H11z"
            />
          </svg>
          Continue with Microsoft
        </UButton>
      </UCard>
    </div>
  </main>
</template>
