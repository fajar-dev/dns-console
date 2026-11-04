<script setup lang="ts">
const { data: session } = await useFetch('/api/auth/session')
const password = ref('')
const error = ref('')
const loading = ref(false)
async function login() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { password: password.value } })
    password.value = ''
    await navigateTo('/')
  } catch (value) {
    error.value = consoleError(value)
  } finally {
    loading.value = false
  }
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
          </h1><p class="mt-2 text-sm text-muted">
            Sign in to your Cloudflare workspace.
          </p>
        </div>
        <UAlert
          v-if="!session?.authConfigured"
          class="mb-5"
          color="warning"
          variant="soft"
          title="Server setup required"
          description="Set NUXT_ADMIN_PASSWORD (12+ characters) and NUXT_SESSION_PASSWORD (32+ characters) in your server environment. See .env.example."
        />
        <form
          class="space-y-5"
          @submit.prevent="login"
        >
          <UFormField
            label="Admin password"
            name="password"
            :error="error || undefined"
          >
            <UInput
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="Enter your password"
              size="lg"
              class="w-full"
              required
              :disabled="!session?.authConfigured"
            />
          </UFormField>
          <UButton
            type="submit"
            label="Sign in to workspace"
            trailing-icon="i-lucide-arrow-right"
            block
            size="lg"
            :loading="loading"
            :disabled="!session?.authConfigured"
          />
        </form>
      </UCard>
      <p class="mt-5 text-center text-xs text-muted">
        Private admin access · Powered by Cloudflare & Bun
      </p>
    </div>
  </main>
</template>
