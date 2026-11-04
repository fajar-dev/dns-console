import { describe, expect, test } from 'bun:test'
import { effectScope, ref } from 'vue'
import { useTablePagination } from '../../app/composables/useTablePagination'

describe('Table pagination', () => {
  test('preserves original route indices when moving between pages', () => {
    const scope = effectScope()
    try {
      scope.run(() => {
        const routes = ref(Array.from({ length: 31 }, (_, index) => ({ index: index + 5, hostname: `route${index}.example.com` })))
        const { page, pageSize, visible } = useTablePagination(routes)
        expect(pageSize.value).toBe(25)
        expect(visible.value).toHaveLength(25)
        page.value = 2
        expect(visible.value).toHaveLength(6)
        expect(visible.value[0]?.index).toBe(30)
        expect(visible.value.at(-1)?.index).toBe(35)
      })
    } finally {
      scope.stop()
    }
  })

  test('moves back to a valid page after deleting the final record on a page', () => {
    const scope = effectScope()
    try {
      scope.run(() => {
        const records = ref(Array.from({ length: 26 }, (_, id) => ({ id })))
        const { page, visible } = useTablePagination(records)
        page.value = 2
        records.value = records.value.slice(0, 25)
        expect(page.value).toBe(1)
        expect(visible.value).toHaveLength(25)
        records.value = []
        expect(page.value).toBe(1)
        expect(visible.value).toEqual([])
      })
    } finally {
      scope.stop()
    }
  })

  test('resets to the first page when filters, selected resource or page size change', () => {
    const scope = effectScope()
    try {
      scope.run(() => {
        const items = ref(Array.from({ length: 100 }, (_, id) => ({ id })))
        const search = ref('')
        const selectedResource = ref('first')
        const { page, pageSize, visible } = useTablePagination(items, [search, selectedResource])
        page.value = 3
        search.value = 'example'
        expect(page.value).toBe(1)
        page.value = 3
        selectedResource.value = 'second'
        expect(page.value).toBe(1)
        page.value = 3
        pageSize.value = 10
        expect(page.value).toBe(1)
        expect(visible.value).toHaveLength(10)
      })
    } finally {
      scope.stop()
    }
  })
})
