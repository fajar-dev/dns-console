<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { WorkspaceTunnel } from '#shared/types/workspace'
import { tunnelRoutesPath } from '#shared/utils/resource-paths'
import type { RouteInput, IngressRule, Zone } from '#shared/types/cloudflare'
import { findHostnameZone } from '#shared/utils/hostnames'
import { routeSchema } from '#shared/validation/cloudflare'

const props = defineProps<{ tunnel: WorkspaceTunnel, version: string, zones: Zone[], rule?: IngressRule, index?: number }>()
const emit = defineEmits<{ saved: [], changed: [] }>()
const matchingZone = props.rule?.hostname ? findHostnameZone(props.rule.hostname, props.zones) : undefined
const state = reactive({ zoneId: matchingZone?.id ?? props.zones[0]?.id ?? '', hostname: props.rule?.hostname ?? '', service: props.rule?.service ?? 'http://localhost:3000', version: props.version, index: props.index })
const { busy, mutate } = useMutation()
const stale = computed(() => props.version !== state.version)
async function submit(event: FormSubmitEvent<RouteInput>) {
  const saved = await mutate(() => $fetch(tunnelRoutesPath(props.tunnel), { method: 'POST', body: event.data }), 'Tunnel route saved')
  if (saved) emit('saved')
  else emit('changed')
}
</script>

<template>
  <UForm
    :state="state"
    :schema="routeSchema"
    class="space-y-5"
    @submit="submit"
  >
    <fieldset
      :disabled="busy || stale"
      class="min-w-0 space-y-5"
    >
      <legend class="sr-only">
        Tunnel route details
      </legend>
      <UAlert
        v-if="stale"
        color="warning"
        title="Configuration changed"
        description="Close this dialog and reopen the route to review the latest configuration before saving."
      />
      <UFormField
        label="Domain"
        name="zoneId"
      >
        <USelect
          v-model="state.zoneId"
          :items="zones.map(zone => ({ label: zone.name, value: zone.id }))"
          class="w-full"
          :disabled="!!rule"
        />
      </UFormField>
      <UFormField
        label="Public hostname"
        name="hostname"
        :help="rule ? 'Create a new route to change the hostname.' : 'A proxied CNAME is created automatically.'"
      >
        <UInput
          v-model="state.hostname"
          placeholder="app.example.com"
          class="w-full"
          :disabled="!!rule"
        />
      </UFormField>
      <UFormField
        label="Origin service"
        name="service"
        help="This address must be reachable from the machine running cloudflared."
      >
        <UInput
          v-model="state.service"
          placeholder="http://localhost:3000"
          class="w-full"
        />
      </UFormField>
      <p
        v-if="rule?.path"
        class="text-xs text-muted"
      >
        Existing path match is preserved: {{ rule.path }}
      </p>
    </fieldset>
    <div class="flex justify-end">
      <UButton
        type="submit"
        :label="rule ? 'Save route' : 'Publish route'"
        icon="i-lucide-arrow-up-right"
        :loading="busy"
        :disabled="!zones.length || stale"
      />
    </div>
  </UForm>
</template>
