import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable, type DataTableColumn } from './data-table'

type Row = { id: string; name: string; count: number }

function makeRows(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `row-${i}`,
    name: `Item ${String(i).padStart(2, '0')}`,
    count: n - i, // descending, so sort-by-name and sort-by-count disagree
  }))
}

const columns: DataTableColumn<Row>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (r) => r.name,
    sortValue: (r) => r.name,
  },
  {
    key: 'count',
    header: 'Count',
    align: 'right',
    render: (r) => r.count,
    sortValue: (r) => r.count,
  },
]

function renderTable(rows: Row[], props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) {
  return render(
    <DataTable
      columns={columns}
      data={rows}
      getRowKey={(r) => r.id}
      renderMobileItem={(r) => <li key={r.id}>{r.name}</li>}
      {...props}
    />
  )
}

function desktopTable() {
  // The mobile <ul> also renders row text, so scope queries to the <table>.
  return within(screen.getByRole('table'))
}

describe('DataTable', () => {
  it('defaults to a page size of 10', () => {
    renderTable(makeRows(25))
    const table = desktopTable()
    expect(table.getAllByRole('row')).toHaveLength(1 + 10) // header + 10 body rows
    expect(table.getByText('Item 00')).toBeInTheDocument()
    expect(table.queryByText('Item 10')).not.toBeInTheDocument()
    expect(screen.getByText('1–10 of 25')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
  })

  it('paginates with next/previous controls', async () => {
    const user = userEvent.setup()
    renderTable(makeRows(25))

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
    expect(desktopTable().getByText('Item 10')).toBeInTheDocument()
    expect(desktopTable().queryByText('Item 00')).not.toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Previous page' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).not.toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('disables Previous on the first page', () => {
    renderTable(makeRows(25))
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })

  it('does not render pagination for an empty dataset', () => {
    renderTable([])
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })

  it('cycles a sortable column asc -> desc -> unsorted on repeated clicks', async () => {
    const user = userEvent.setup()
    renderTable(makeRows(3)) // count is 3,2,1 in original (unsorted) order

    const table = desktopTable()
    const rowsInOrder = () => table.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent)

    expect(rowsInOrder()).toEqual(['Item 00', 'Item 01', 'Item 02'])

    const nameHeader = screen.getByRole('columnheader', { name: /Name/ })
    const nameSortButton = within(nameHeader).getByRole('button')
    await user.click(nameSortButton) // asc
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')
    expect(rowsInOrder()).toEqual(['Item 00', 'Item 01', 'Item 02'])

    await user.click(nameSortButton) // desc
    expect(nameHeader).toHaveAttribute('aria-sort', 'descending')
    expect(rowsInOrder()).toEqual(['Item 02', 'Item 01', 'Item 00'])

    await user.click(nameSortButton) // back to unsorted (original order)
    expect(nameHeader).toHaveAttribute('aria-sort', 'none')
    expect(rowsInOrder()).toEqual(['Item 00', 'Item 01', 'Item 02'])
  })

  it('resets to page 1 when sorting after navigating to a later page', async () => {
    const user = userEvent.setup()
    renderTable(makeRows(25))

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Count/ }))
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
  })

  it('changes page size via the rows-per-page select, defaulting to 10 and resetting to page 1', async () => {
    const user = userEvent.setup()
    renderTable(makeRows(25))

    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toHaveTextContent('10')

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Rows per page' }))
    await user.click(screen.getByRole('option', { name: '25' }))

    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    expect(desktopTable().getAllByRole('row')).toHaveLength(1 + 25)
  })

  it('keeps the mobile list in sync with the same sorted, paginated slice as the desktop table', async () => {
    const user = userEvent.setup()
    renderTable(makeRows(15))

    await user.click(screen.getByRole('button', { name: /Name/ })) // asc, no-op on order but exercises the shared slice
    await user.click(screen.getByRole('button', { name: 'Next page' }))

    const table = desktopTable()
    const desktopNames = table.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent)

    const mobileList = screen.getAllByRole('list')[0]
    const mobileNames = within(mobileList).getAllByRole('listitem').map((li) => li.textContent)

    expect(mobileNames).toEqual(desktopNames)
  })

  it('renders a non-sortable column without a sort button', () => {
    const noSortColumns: DataTableColumn<Row>[] = [{ key: 'name', header: 'Name', render: (r) => r.name }]
    render(
      <DataTable
        columns={noSortColumns}
        data={makeRows(2)}
        getRowKey={(r) => r.id}
        renderMobileItem={(r) => <li key={r.id}>{r.name}</li>}
      />
    )
    expect(screen.queryByRole('button', { name: /Name/ })).not.toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
  })
})
