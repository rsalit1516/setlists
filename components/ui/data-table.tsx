'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type DataTableColumn<T> = {
  key: string
  header: ReactNode
  align?: 'left' | 'right'
  className?: string
  /** `index` is the row's position in the current sort order across the whole dataset, not just the current page. */
  render: (row: T, index: number) => ReactNode
  /** Presence enables sorting on this column; omit for columns that shouldn't be sortable. */
  sortValue?: (row: T) => string | number
}

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

type SortDir = 'asc' | 'desc'

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  renderMobileItem,
  mobileFooter,
  footer,
  defaultPageSize = 10,
  className,
}: {
  columns: DataTableColumn<T>[]
  data: T[]
  /** `index` is the row's position in the current sort order across the whole dataset, not just the current page. */
  getRowKey: (row: T, index: number) => string
  renderMobileItem: (row: T, index: number) => ReactNode
  /** Extra list item rendered after the mobile cards, e.g. a totals row. */
  mobileFooter?: ReactNode
  /** Extra <TableRow> rendered in a <TableFooter>, unaffected by sorting/paging, e.g. a totals row. */
  footer?: ReactNode
  defaultPageSize?: PageSize
  className?: string
}) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(defaultPageSize)

  const sortColumn = sortKey ? columns.find((c) => c.key === sortKey) : undefined

  const sortedData = useMemo(() => {
    if (!sortColumn?.sortValue) return data
    const sortValue = sortColumn.sortValue
    return data
      .map((row, i) => ({ row, i, v: sortValue(row) }))
      .sort((a, b) => {
        if (a.v < b.v) return sortDir === 'asc' ? -1 : 1
        if (a.v > b.v) return sortDir === 'asc' ? 1 : -1
        return a.i - b.i // stable tiebreak
      })
      .map((entry) => entry.row)
  }, [data, sortColumn, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const pageData = sortedData.slice(pageStart, pageStart + pageSize)

  function handleSort(key: string) {
    setPage(1)
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
      return
    }
    if (sortDir === 'asc') {
      setSortDir('desc')
      return
    }
    setSortKey(null)
    setSortDir('asc')
  }

  function handlePageSizeChange(value: string) {
    setPageSize(Number(value) as PageSize)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={cn('hidden overflow-x-auto rounded-lg border md:block', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  aria-sort={
                    col.sortValue
                      ? sortKey === col.key
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                  className={cn(col.align === 'right' && 'text-right', col.className)}
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className={cn(
                        'inline-flex h-10 items-center gap-1 rounded font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                        col.align === 'right' && 'flex-row-reverse'
                      )}
                    >
                      {col.header}
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="size-3.5" />
                        ) : (
                          <ArrowDown className="size-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3.5 text-muted-foreground/50" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.map((row, i) => (
              <TableRow key={getRowKey(row, pageStart + i)}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={cn(col.align === 'right' && 'text-right', col.className)}>
                    {col.render(row, pageStart + i)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {footer && <TableFooter>{footer}</TableFooter>}
        </Table>
      </div>

      <ul className="space-y-2 md:hidden">
        {pageData.map((row, i) => renderMobileItem(row, pageStart + i))}
        {mobileFooter}
      </ul>

      <DataTablePagination
        page={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={sortedData.length}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  )
}

function DataTablePagination({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  totalPages: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (value: string) => void
}) {
  if (totalItems === 0) return null

  const rangeStart = (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, totalItems)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="whitespace-nowrap">Rows per page</span>
        <Select value={String(pageSize)} onValueChange={(value) => value && onPageSizeChange(value)}>
          <SelectTrigger size="sm" aria-label="Rows per page" className="h-9 min-h-9 w-[4.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {rangeStart}–{rangeEnd} of {totalItems}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[5.5rem] text-center text-sm tabular-nums text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
