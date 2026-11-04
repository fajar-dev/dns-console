<script setup lang="ts">
import type { DnsRecord } from '#shared/types/cloudflare'
import { dnsRecordSchema, editableDnsTypes } from '#shared/validation/cloudflare'

const props = defineProps<{ record?: DnsRecord, zoneName: string, zoneId: string }>()
const emit = defineEmits<{ saved: [], cancel: [] }>()
const state = reactive({ type: (props.record?.type ?? 'A') as typeof editableDnsTypes[number], name: props.record?.name ?? props.zoneName, content: props.record?.content ?? '', ttl: props.record?.ttl ?? 1, proxied: props.record?.proxied ?? false, priority: props.record?.priority ?? 10, comment: props.record?.comment ?? '' })
const { busy, mutate } = useConsole()
const notesOpen = ref(!!state.comment)
const ttlOptions = [
  { label: 'Auto', value: 1 },
  { label: '1 minute', value: 60 },
  { label: '5 minutes', value: 300 },
  { label: '15 minutes', value: 900 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
  { label: '1 day', value: 86400 },
  { label: 'Custom duration…', value: 0 }
]
const customTtl = ref(!ttlOptions.some(option => option.value === state.ttl))
const ttlSelection = computed({
  get: () => state.proxied ? 1 : customTtl.value ? 0 : state.ttl,
  set: (value: number) => {
    customTtl.value = value === 0
    if (value !== 0) state.ttl = value
    else if (state.ttl === 1) state.ttl = 300
  }
})
const contentField = computed(() => {
  switch (state.type) {
    case 'A': return { label: 'IPv4 address', placeholder: '192.0.2.1' }
    case 'AAAA': return { label: 'IPv6 address', placeholder: '2001:db8::1' }
    case 'MX': return { label: 'Mail server', placeholder: `mail.${props.zoneName}` }
    case 'TXT': return { label: 'Text value', placeholder: 'Enter the record value' }
    case 'NS': return { label: 'Nameserver', placeholder: 'ns1.example.com' }
    default: return { label: 'Target hostname', placeholder: `target.${props.zoneName}` }
  }
})
const proxySupported = computed(() => ['A', 'AAAA', 'CNAME'].includes(state.type))
watch(proxySupported, (supported) => {
  if (!supported) state.proxied = false
})
async function submit() {
  const input = dnsRecordSchema.parse(state)
  const path = `/api/zones/${props.zoneId}/records${props.record ? `/${props.record.id}` : ''}`
  if (await mutate(() => $fetch(path, { method: props.record ? 'PATCH' : 'POST', body: input }), 'DNS record saved')) emit('saved')
}
</script>

<template>
  <UForm
    :schema="dnsRecordSchema"
    :state="state"
    @submit="submit"
  >
    <fieldset
      :disabled="busy"
      class="min-w-0 space-y-4"
    >
      <legend class="sr-only">
        DNS record details
      </legend>
      <div class="grid gap-4 sm:grid-cols-[112px_minmax(0,1fr)]">
        <UFormField
          label="Record type"
          name="type"
          required
        >
          <USelect
            v-model="state.type"
            :items="[...editableDnsTypes]"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Hostname"
          name="name"
          required
        >
          <UInput
            v-model="state.name"
            class="w-full"
            placeholder="app.example.com"
            autocomplete="off"
            spellcheck="false"
          />
        </UFormField>
      </div>
      <UFormField
        :label="contentField.label"
        name="content"
        required
      >
        <UTextarea
          v-if="state.type === 'TXT'"
          v-model="state.content"
          class="w-full"
          :rows="3"
          :placeholder="contentField.placeholder"
          spellcheck="false"
        />
        <UInput
          v-else
          v-model="state.content"
          class="w-full"
          :placeholder="contentField.placeholder"
          autocomplete="off"
          spellcheck="false"
        />
      </UFormField>
      <div
        class="grid gap-4"
        :class="proxySupported || state.type === 'MX' ? 'sm:grid-cols-2' : ''"
      >
        <UFormField
          label="TTL"
          name="ttl"
          :help="state.proxied ? 'Auto when proxied.' : 'DNS cache duration.'"
        >
          <USelect
            v-model="ttlSelection"
            :items="ttlOptions"
            :disabled="state.proxied"
            class="w-full"
            aria-label="Time to live"
          />
          <UInput
            v-if="customTtl && !state.proxied"
            v-model.number="state.ttl"
            type="number"
            :min="60"
            :max="86400"
            class="mt-2 w-full"
            aria-label="Custom TTL in seconds"
            placeholder="Seconds, from 60 to 86400"
          />
        </UFormField>
        <UFormField
          v-if="state.type === 'MX'"
          label="Priority"
          name="priority"
          help="Lower values take precedence."
        >
          <UInput
            v-model.number="state.priority"
            type="number"
            :min="0"
            :max="65535"
            class="w-full"
          />
        </UFormField>
        <UFormField
          v-if="proxySupported"
          label="Cloudflare proxy"
          name="proxied"
          :help="state.proxied ? 'Route through Cloudflare.' : 'Connect directly to origin.'"
        >
          <div class="flex h-9 items-center justify-between gap-3 rounded-md border border-default px-3 dark:border-accented">
            <span class="flex items-center gap-2 text-sm text-highlighted">
              <UIcon
                name="i-lucide-cloud"
                class="size-4 shrink-0"
                :class="state.proxied ? 'text-primary' : 'text-muted'"
              />
              {{ state.proxied ? 'Proxied' : 'DNS only' }}
            </span>
            <USwitch
              v-model="state.proxied"
              size="sm"
              aria-label="Route traffic through the Cloudflare proxy"
              class="shrink-0"
            />
          </div>
        </UFormField>
      </div>
      <UFormField
        v-if="notesOpen"
        label="Comment"
        name="comment"
        hint="Optional"
      >
        <UTextarea
          v-model="state.comment"
          :rows="2"
          placeholder="What is this record used for?"
          class="w-full"
        />
      </UFormField>
      <UButton
        v-else
        type="button"
        label="Add a comment"
        icon="i-lucide-plus"
        color="neutral"
        variant="link"
        size="xs"
        class="px-0 text-muted"
        @click="notesOpen = true"
      />
    </fieldset>
    <div class="mt-4 flex items-center justify-end gap-2">
      <UButton
        type="button"
        label="Cancel"
        color="neutral"
        variant="outline"
        :disabled="busy"
        @click="emit('cancel')"
      />
      <UButton
        type="submit"
        :label="record ? 'Save changes' : 'Create record'"
        :loading="busy"
      />
    </div>
  </UForm>
</template>
