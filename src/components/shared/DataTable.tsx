import { useState } from 'react'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/utils'
import { LoadingSpinner, EmptyState, ErrorState } from './LoadingPage'

// ── Types ─────────────────────────────────────────────────────
export interface Column<T> {
  key:        string
  header:     string
  render?:    (row: T) => React.ReactNode
  className?: string
  sortable?:  boolean
}

interface DataTableProps<T> {
  data:        T[]
  columns:     Column<T>[]
  total?:      number
  page?:       number
  perPage?:    number
  onPageChange?:  (page: number) => void
  loading?:    boolean
  error?:      string | null
  onRetry?:    () => void
  searchable?: boolean
  searchPlaceholder?: string
  onSearch?:   (q: string) => void
  filters?:    React.ReactNode
  actions?:    React.ReactNode
  rowKey:      (row: T) => string | number
  onRowClick?: (row: T) => void
  emptyTitle?:    string
  emptyDescription?: string
}

// ── Pagination ────────────────────────────────────────────────
function Pagination({ page, total, perPage, onChange }: {
  page: number; total: number; perPage: number; onChange: (p: number) => void
}) {
  const lastPage = Math.ceil(total / perPage)
  if (lastPage <= 1) return null

  const pages: (number | '...')[] = []
  if (lastPage <= 7) {
    for (let i = 1; i <= lastPage; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(lastPage - 1, page + 1); i++) pages.push(i)
    if (page < lastPage - 2) pages.push('...')
    pages.push(lastPage)
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <span className="text-xs text-gray-500">
        {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} sur {total} résultats
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="btn-icon disabled:opacity-40"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) => (
          <button
            key={i}
            onClick={() => typeof p === 'number' && onChange(p)}
            disabled={p === '...'}
            className={cn(
              'w-8 h-8 text-xs rounded-lg font-medium transition-colors',
              p === page
                ? 'bg-primary-700 text-white'
                : p === '...'
                ? 'text-gray-400 cursor-default'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === lastPage}
          className="btn-icon disabled:opacity-40"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ── DataTable ─────────────────────────────────────────────────
export default function DataTable<T>({
  data, columns, total = 0, page = 1, perPage = 25,
  onPageChange, loading, error, onRetry,
  searchable, searchPlaceholder = 'Rechercher…',
  onSearch, filters, actions,
  rowKey, onRowClick,
  emptyTitle, emptyDescription,
}: DataTableProps<T>) {

  const [searchVal, setSearchVal] = useState('')

  const handleSearch = (val: string) => {
    setSearchVal(val)
    onSearch?.(val)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">

      {/* Toolbar */}
      {(searchable || filters || actions) && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
          {searchable && (
            <div className="relative flex-1 min-w-48 max-w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchVal}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="input pl-9 py-1.5 text-sm h-8"
              />
            </div>
          )}
          {filters && (
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-gray-400" />
              {filters}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </div>
      )}

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <div className="flex justify-center">
                    <LoadingSpinner />
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="py-4">
                  <ErrorState message={error} onRetry={onRetry} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-4">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    i % 2 === 1 ? 'bg-primary-50/40' : '',
                    onRowClick ? 'cursor-pointer hover:bg-primary-50 transition-colors' : ''
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.className}>
                      {col.render
                        ? col.render(row)
                        : (row as any)[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {onPageChange && total > perPage && (
        <Pagination
          page={page}
          total={total}
          perPage={perPage}
          onChange={onPageChange}
        />
      )}
    </div>
  )
}
