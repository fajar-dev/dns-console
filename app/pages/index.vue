<script setup lang="ts">
import type { DnsRecord } from '#shared/types/cloudflare'
import { editableDnsTypes } from '#shared/validation/cloudflare'

const { data: zones, error: zonesError, status: zonesStatus, refresh: refreshZones } = await useFetch('/api/zones', { default: () => [] })
const selectedZone = ref(zones.value[0]?.id ?? '')
watch(zones, (value) => {
  if (!value.some(zone => zone.id === selectedZone.value)) selectedZone.value = value[0]?.id ?? ''
})
const zone = computed(() => zones.value.find(item => item.id === selectedZone.value))
const { data: records, error, status, refresh } = await useAsyncData('dns-records', () => selectedZone.value ? $fetch<DnsRecord[]>(`/api/zones/${selectedZone.value}/records`) : Promise.resolve([]), { watch: [selectedZone], default: () => [] })
const search = ref('')
const type = ref('All types')
const page = ref(1)
const modal = ref(false)
const editing = ref<DnsRecord>()
const deleting = ref<DnsRecord>()
const { busy, mutate } = useConsole()
const filtered = computed(() => records.value.filter(record => (type.value === 'All types' || record.type === type.value) && `${record.name} ${record.content}`.toLowerCase().includes(search.value.toLowerCase())))
const visible = computed(() => filtered.value.slice((page.value - 1) * 15, page.value * 15))
watch([search, type, selectedZone], () => {
  page.value = 1
})
const stats = computed(() => [{ label: 'Domains', value: zones.value.length, icon: 'i-lucide-globe' }, { label: 'DNS records', value: records.value.length, icon: 'i-lucide-list-tree' }, { label: 'Proxied records', value: records.value.filter(record => record.proxied).length, icon: 'i-lucide-shield-check' }])
function open(record?: DnsRecord) {
  editing.value = record
  modal.value = true
}
async function saved() {
  modal.value = false
  await refresh()
}
async function remove() {
  if (!deleting.value) return
  if (await mutate(() => $fetch(`/api/zones/${selectedZone.value}/records/${deleting.value!.id}`, { method: 'DELETE', body: {} }), 'DNS record deleted')) deleting.value = undefined
  await refresh()
}
</script>

<template>
  <div>
    <PageHeading
      eyebrow="Network control"
      title="DNS records"
      description="Manage your domains and the records that connect them to your services."
    >
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="outline"
        aria-label="Refresh DNS records"
        :loading="status === 'pending'"
        @click="refresh()"
      />
      <UButton
        label="Add record"
        icon="i-lucide-plus"
        :disabled="!zone"
        @click="open()"
      />
    </PageHeading>
    <RequestError
      v-if="zonesError"
      :error="zonesError"
      class="mb-6"
      @retry="refreshZones()"
    />
    <div class="mb-8 grid gap-4 sm:grid-cols-3">
      <UCard
        v-for="stat in stats"
        :key="stat.label"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm text-muted">
              {{ stat.label }}
            </p><p class="mt-3 text-2xl font-medium tracking-tight text-highlighted">
              {{ stat.value }}
            </p>
          </div><span class="flex size-8 items-center justify-center rounded-md bg-default"><UIcon
            :name="stat.icon"
            class="size-4 text-muted"
          /></span>
        </div>
      </UCard>
    </div>
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-globe"
              class="text-primary"
            /><h2 class="font-semibold">
              Domain records
            </h2><UBadge
              variant="subtle"
              color="neutral"
            >
              {{ filtered.length }}
            </UBadge>
          </div><USelect
            v-model="selectedZone"
            :items="zones.map(item => ({ label: item.name, value: item.id }))"
            placeholder="Select a domain"
            class="w-full sm:w-64"
            :loading="zonesStatus === 'pending'"
            aria-label="Domain"
          />
        </div>
      </template>
      <div class="flex flex-wrap gap-3 border-b border-muted p-4">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Search hostname or content…"
          class="min-w-48 flex-1"
          aria-label="Search DNS records"
        /><USelect
          v-model="type"
          :items="['All types', ...new Set(records.map(record => record.type))]"
          class="w-36"
          aria-label="Record type"
        />
      </div>
      <div
        v-if="status === 'pending'"
        class="space-y-4 p-6"
      >
        <USkeleton
          v-for="i in 5"
          :key="i"
          class="h-10 w-full"
        />
      </div>
      <RequestError
        v-else-if="error"
        :error="error"
        class="m-5"
        @retry="refresh()"
      />
      <div
        v-else-if="!visible.length"
        class="px-6 py-16 text-center"
      >
        <UIcon
          name="i-lucide-search"
          class="mb-3 size-9 text-dimmed"
        /><h3 class="font-semibold">
          {{ zone ? 'No matching records' : 'No domains available' }}
        </h3><p class="mt-2 text-sm text-muted">
          {{ zone ? 'Try another search or add your first DNS record.' : 'Check your Cloudflare account and token permissions in Configuration.' }}
        </p><UButton
          v-if="!zone"
          to="/settings"
          label="Open configuration"
          variant="soft"
          class="mt-5"
        />
      </div>
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full text-left text-sm">
          <thead class="bg-default text-xs text-muted">
            <tr>
              <th class="px-5 py-3 font-medium">
                Type
              </th><th class="px-5 py-3 font-medium">
                Hostname
              </th><th class="px-5 py-3 font-medium">
                Content
              </th><th class="px-5 py-3 font-medium">
                Proxy
              </th><th class="px-5 py-3 font-medium">
                TTL
              </th><th class="px-5 py-3 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead><tbody class="divide-y divide-muted">
            <tr
              v-for="record in visible"
              :key="record.id"
              class="hover:bg-default"
            >
              <td class="px-5 py-4">
                <UBadge
                  color="neutral"
                  variant="subtle"
                >
                  {{ record.type }}
                </UBadge>
              </td><td class="px-5 py-4 font-medium whitespace-nowrap">
                {{ record.name }}
              </td><td
                class="max-w-64 truncate px-5 py-4 font-mono text-xs text-muted"
                :title="record.content"
              >
                {{ record.content }}
              </td><td class="px-5 py-4">
                <span
                  class="flex items-center gap-1.5 whitespace-nowrap text-xs"
                  :class="record.proxied ? 'text-primary' : 'text-muted'"
                ><UIcon
                  name="i-lucide-cloud"
                  class="size-4"
                />{{ record.proxied ? 'Proxied' : 'DNS only' }}</span>
              </td><td class="px-5 py-4 text-xs text-muted">
                {{ record.ttl === 1 ? 'Auto' : `${record.ttl}s` }}
              </td><td class="px-5 py-4">
                <div class="flex justify-end gap-1">
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    :disabled="!editableDnsTypes.includes(record.type as typeof editableDnsTypes[number])"
                    :aria-label="`Edit ${record.name}`"
                    @click="open(record)"
                  /><UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    :aria-label="`Delete ${record.name}`"
                    @click="deleting = record"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-xs text-muted">
            {{ filtered.length }} records · Changes sync to Cloudflare
          </p><UPagination
            v-if="filtered.length > 15"
            v-model:page="page"
            :total="filtered.length"
            :items-per-page="15"
            size="sm"
          />
        </div>
      </template>
    </UCard>
    <UModal
      v-model:open="modal"
      :title="editing ? 'Edit DNS record' : 'Add DNS record'"
      :description="zone?.name"
    >
      <template #body>
        <DnsRecordForm
          v-if="modal && zone"
          :key="editing?.id ?? 'new'"
          :record="editing"
          :zone-id="zone.id"
          :zone-name="zone.name"
          @saved="saved"
          @cancel="modal = false"
        />
      </template>
    </UModal>
    <UModal
      :open="!!deleting"
      title="Delete DNS record?"
      description="This change affects live DNS traffic and cannot be undone automatically."
      @update:open="value => { if (!value && !busy) deleting = undefined }"
    >
      <template #body>
        <p class="text-sm">
          Delete <strong>{{ deleting?.type }} {{ deleting?.name }}</strong>? If a tunnel uses this record, its public hostname may stop working.
        </p><div class="mt-4 flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="busy"
            @click="deleting = undefined"
          /><UButton
            label="Delete record"
            color="error"
            :loading="busy"
            @click="remove"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
