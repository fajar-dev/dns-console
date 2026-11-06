<script setup lang="ts">
import { editableDnsTypes } from '#shared/validation/cloudflare'

const {
  zones,
  zonesError,
  zonesIssues,
  zonesLoading,
  selectedZone,
  zone,
  records,
  error,
  recordsLoading,
  initialLoading,
  search,
  type,
  modal,
  editing,
  deleting,
  busy,
  filtered,
  page,
  pageSize,
  visible,
  stats,
  recordTypes,
  open,
  saved,
  remove
} = useDnsRecords()
</script>

<template>
  <div :aria-busy="recordsLoading || busy">
    <PageHeading
      eyebrow="Network control"
      icon="i-lucide-globe"
      title="DNS records"
      description="Manage your domains and the records that connect them to your services."
    >
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
    />
    <WorkspaceIssues
      :issues="zonesIssues"
      class="mb-6"
    />
    <ConsoleMetrics :items="stats" />
    <UCard :ui="{ body: 'p-0 sm:p-0', footer: 'p-0 sm:p-0' }">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-globe"
              class="text-primary"
            />
            <h2 class="font-semibold">
              Domain records
            </h2>
            <USkeleton
              v-if="initialLoading"
              class="h-5 w-7"
            />
            <UBadge
              v-else
              variant="subtle"
              color="neutral"
            >
              {{ filtered.length }}
            </UBadge>
          </div>
          <div class="flex w-full flex-col items-end gap-2 sm:w-auto">
            <USelect
              v-model="selectedZone"
              :items="zones.map(item => ({ label: `${item.name} · ${item.owner.name}`, value: item.key }))"
              placeholder="Select a domain"
              class="w-full sm:w-64"
              :loading="zonesLoading"
              :disabled="zonesLoading || busy || !zones.length"
              aria-label="Domain"
            />
            <AccountBadge
              v-if="zone"
              :account="zone.owner"
            />
          </div>
        </div>
      </template>
      <div class="flex flex-wrap gap-3 border-b border-muted p-4">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Search hostname or content…"
          class="min-w-48 flex-1"
          aria-label="Search DNS records"
          :disabled="initialLoading || !zone"
        />
        <USelect
          v-model="type"
          :items="['All types', ...new Set(records.map(record => record.type))]"
          class="w-36"
          aria-label="Record type"
          :disabled="initialLoading || !zone"
        />
      </div>
      <div
        v-if="recordTypes.length && !initialLoading && !error"
        class="flex flex-wrap items-center gap-2 border-b border-muted px-4 py-3"
        aria-label="Quick record filters"
      >
        <UButton
          label="All records"
          size="xs"
          color="neutral"
          :variant="type === 'All types' ? 'outline' : 'ghost'"
          :aria-pressed="type === 'All types'"
          @click="type = 'All types'"
        />
        <UButton
          v-for="item in recordTypes"
          :key="item.value"
          size="xs"
          :color="type === item.value ? 'primary' : 'neutral'"
          :variant="type === item.value ? 'outline' : 'ghost'"
          :aria-pressed="type === item.value"
          @click="type = item.value"
        >
          {{ item.value }} <span class="font-mono text-[10px] opacity-70">{{ item.count }}</span>
        </UButton>
      </div>
      <TableSkeleton
        v-if="initialLoading"
        label="Loading DNS records"
      />
      <RequestError
        v-else-if="error"
        :error="error"
        class="m-5"
      />
      <div
        v-else-if="!visible.length"
        class="px-6 py-16 text-center"
      >
        <UIcon
          name="i-lucide-search"
          class="mb-3 size-9 text-dimmed"
        />
        <h3 class="font-semibold">
          {{ zone ? 'No matching records' : 'No domains available' }}
        </h3>
        <p class="mt-2 text-sm text-muted">
          {{ zone ? 'Try another search or add your first DNS record.' : 'Check your Cloudflare account and token permissions in Configuration.' }}
        </p>
        <UButton
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
              </th>
              <th class="px-5 py-3 font-medium">
                Hostname
              </th>
              <th class="px-5 py-3 font-medium">
                Content
              </th>
              <th class="px-5 py-3 font-medium">
                Proxy
              </th>
              <th class="px-5 py-3 font-medium">
                TTL
              </th>
              <th class="sticky right-0 z-10 w-24 min-w-24 bg-default px-5 py-3 text-right font-medium shadow-[-1px_0_0_var(--ui-border-muted)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-muted">
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
              </td>
              <td class="px-5 py-4 font-medium whitespace-nowrap">
                {{ record.name }}
              </td>
              <td
                class="max-w-64 truncate px-5 py-4 font-mono text-xs text-muted"
                :title="record.content"
              >
                {{ record.content }}
              </td>
              <td class="px-5 py-4">
                <span
                  class="flex items-center gap-1.5 whitespace-nowrap text-xs"
                  :class="record.proxied ? 'text-primary' : 'text-muted'"
                >
                  <UIcon
                    name="i-lucide-cloud"
                    class="size-4"
                  />{{ record.proxied ? 'Proxied' : 'DNS only' }}</span>
              </td>
              <td class="px-5 py-4 text-xs text-muted">
                {{ record.ttl === 1 ? 'Auto' : `${record.ttl}s` }}
              </td>
              <td class="sticky right-0 z-10 w-24 min-w-24 bg-default px-5 py-4 shadow-[-1px_0_0_var(--ui-border-muted)]">
                <div class="flex justify-end">
                  <RowActions
                    :label="`${record.type} ${record.name}`"
                    :disabled="recordsLoading || busy"
                    :edit-disabled="!editableDnsTypes.includes(record.type as typeof editableDnsTypes[number])"
                    @edit="open(record)"
                    @delete="deleting = record"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <TablePagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="filtered.length"
          :loading="recordsLoading"
          :error="!!error || !!zonesError"
        />
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
          :key="`${zone.key}:${editing?.id ?? 'new'}`"
          :record="editing"
          :zone="zone"
          @saved="saved"
          @cancel="modal = false"
        />
      </template>
    </UModal>
    <ConfirmationModal
      :open="!!deleting"
      title="Delete DNS record?"
      description="This change affects live DNS traffic and cannot be undone automatically."
      confirm-label="Delete record"
      :busy="busy"
      @update:open="value => { if (!value) deleting = undefined }"
      @confirm="remove"
    >
      <p class="text-sm">
        Delete <strong>{{ deleting?.type }} {{ deleting?.name }}</strong>? If a tunnel uses this record, its public hostname may stop working.
      </p>
    </ConfirmationModal>
  </div>
</template>
