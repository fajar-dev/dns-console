<script setup lang="ts">
import type { WorkspaceIssue } from '#shared/types/workspace'

defineProps<{ issues: WorkspaceIssue[] }>()
</script>

<template>
  <div
    v-if="issues.length"
    role="status"
    class="rounded-lg border border-warning/30 px-4 py-3 text-sm"
  >
    <p class="font-medium text-warning">
      Some resources are unavailable
    </p>
    <div
      v-for="issue in issues"
      :key="issue.account.id"
      class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted"
    >
      <AccountBadge :account="issue.account" />
      <span>{{ issue.message }}</span>
    </div>
  </div>
</template>
