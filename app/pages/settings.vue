<script setup lang="ts">
import { environment } from '~/constants/configuration'

const { session } = useAuth()
const { data: zones, error, loading } = useZones()
const initialLoading = computed(() => loading.value && !zones.value.length)
</script>

<template>
  <div>
    <PageHeading
      eyebrow="Workspace setup"
      icon="i-lucide-settings-2"
      title="Configuration"
      description="Connect your Cloudflare account using server-side environment variables."
    >
      <UBadge
        :color="session?.cloudflareConfigured ? 'success' : 'warning'"
        variant="subtle"
      >
        {{ session?.cloudflareConfigured ? 'Credentials configured' : 'Setup required' }}
      </UBadge>
    </PageHeading>
    <div class="grid gap-6 xl:grid-cols-3">
      <UCard class="xl:col-span-2">
        <template #header>
          <h2 class="font-semibold">
            Server environment
          </h2>
        </template>
        <p class="mb-5 text-sm leading-relaxed text-muted">
          Copy .env.example to .env for local development. Set these variables in your deployment environment for production, then restart the server. Secrets are never shown or editable in this panel.
        </p>
        <div class="divide-y divide-default">
          <div
            v-for="item in environment"
            :key="item.name"
            class="py-4 first:pt-0 last:pb-0"
          >
            <code class="text-xs font-semibold text-primary">{{ item.name }}</code>
            <p class="mt-1.5 text-sm text-muted">
              {{ item.description }}
            </p>
          </div>
        </div>
      </UCard>
      <div class="space-y-6">
        <UCard>
          <template #header>
            <h2 class="font-semibold">
              Token permissions
            </h2>
          </template>
          <ul class="space-y-3 text-sm">
            <li class="flex gap-2">
              <UIcon
                name="i-lucide-check"
                class="mt-0.5 text-primary"
              />Zone → Zone → Read
            </li>
            <li class="flex gap-2">
              <UIcon
                name="i-lucide-check"
                class="mt-0.5 text-primary"
              />Zone → DNS → Edit
            </li>
            <li class="flex gap-2">
              <UIcon
                name="i-lucide-check"
                class="mt-0.5 text-primary"
              />Account → Cloudflare Tunnel → Edit
            </li>
          </ul>
          <p class="mt-4 text-xs leading-relaxed text-muted">
            Limit the token to the account and zones you intend to manage.
          </p>
          <UButton
            class="mt-5"
            to="https://dash.cloudflare.com/profile/api-tokens"
            target="_blank"
            label="Manage API tokens"
            variant="soft"
            trailing-icon="i-lucide-arrow-up-right"
          />
        </UCard>
        <UCard>
          <template #header>
            <h2 class="font-semibold">
              Connection check
            </h2>
          </template>
          <div
            v-if="initialLoading"
            role="status"
            aria-label="Checking Cloudflare connection"
            class="flex items-center gap-2"
          >
            <USkeleton class="size-4" />
            <USkeleton class="h-4 w-40" />
          </div>
          <RequestError
            v-else-if="error"
            :error="error"
          />
          <p
            v-else
            class="flex items-center gap-2 text-sm"
          >
            <UIcon
              name="i-lucide-circle-check"
              class="text-primary"
            />{{ zones.length }} accessible domains
          </p>
        </UCard>
      </div>
    </div>
  </div>
</template>
