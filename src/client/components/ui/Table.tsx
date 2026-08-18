import React from 'react'
import { clsx } from 'clsx'

export interface Column<T> {
  key: string
  header: React.ReactNode
  render?: (row: T, index: number) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  width?: string
  sortable?: boolean
}

export interface TableProps<T extends Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  keyField?: string
  loading?: boolean
  emptyMessage?: string
  className?: string
  onRowClick?: (row: T) => void
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  keyField = 'id',
  loading = false,
  emptyMessage = 'No data found',
  className,
  onRowClick,
  sortKey,
  sortDir,
  onSort,
}: TableProps<T>) {
  return (
    <div className={clsx('table-wrap', className)}>
      <table className="table" role="table">
        <thead className="table-head">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  'table-th',
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right',
                  col.sortable && 'table-th-sortable',
                )}
                style={col.width ? { width: col.width } : undefined}
                onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                aria-sort={col.sortable && sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                <span className="table-th-content">
                  {col.header}
                  {col.sortable && (
                    <span className="table-sort-icon" aria-hidden="true">
                      {sortKey === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="table-empty">
                <div className="table-loading">
                  <span className="animate-spin" aria-hidden="true">⟳</span> Loading…
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty">{emptyMessage}</td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={String(row[keyField] ?? i)}
                className={clsx('table-row', onRowClick && 'table-row-clickable')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row) } : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(
                      'table-td',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right',
                    )}
                  >
                    {col.render ? col.render(row, i) : String(row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
