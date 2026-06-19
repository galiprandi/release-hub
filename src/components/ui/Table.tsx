import { useState, useMemo } from "react"
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	type SortingState,
	type ColumnFiltersState,
	type PaginationState,
	flexRender,
	type ColumnDef,
} from "@tanstack/react-table"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/* eslint-disable @typescript-eslint/no-unused-vars */
declare module "@tanstack/react-table" {
	interface ColumnMeta<TData, TValue> {
		width?: string
	}
}
/* eslint-enable @typescript-eslint/no-unused-vars */

export interface TableFilter<TData> {
	label: string
	columnId: keyof TData | string
	value: string
	count?: number
}

export interface TableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	className?: string
	filters?: TableFilter<TData>[]
	filterLabel?: string
	pageSize?: number
	activeFilter?: { id: string; value: string } | null
	onFilterChange?: (filter: { id: string; value: string } | null) => void
}

export function Table<TData, TValue>({ columns, data, className, filters, filterLabel = "Filtrar:", pageSize, activeFilter: controlledActiveFilter, onFilterChange }: TableProps<TData, TValue>) {
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: pageSize || 10,
	})

	// Use controlled filter if provided, otherwise use internal state
	const isControlled = controlledActiveFilter !== undefined
	const currentActiveFilter = isControlled ? controlledActiveFilter : (columnFilters.length > 0 ? columnFilters[0] : null)

	// Sync columnFilters with controlled filter - memoized to prevent re-renders
	const effectiveColumnFilters = useMemo(() => {
		if (isControlled && controlledActiveFilter) {
			return [{ id: controlledActiveFilter.id, value: controlledActiveFilter.value }]
		}
		return columnFilters
	}, [isControlled, controlledActiveFilter, columnFilters])

	// Memoize table options to prevent re-renders
	const tableOptions = useMemo(() => ({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		...(pageSize ? { getPaginationRowModel: getPaginationRowModel() } : {}),
		onSortingChange: setSorting,
		onColumnFiltersChange: isControlled ? undefined : setColumnFilters,
		onPaginationChange: setPagination,
		state: {
			sorting,
			columnFilters: effectiveColumnFilters,
			...(pageSize ? { pagination } : {}),
		},
	}), [data, columns, pageSize, isControlled, sorting, effectiveColumnFilters, pagination])

	// TanStack Table's useReactTable returns functions that cannot be memoized safely
	// This is a known limitation and the warning can be safely ignored
	// eslint-disable-next-line react-hooks/incompatible-library
	const table = useReactTable(tableOptions)

	const handleFilterClick = (filter: TableFilter<TData>) => {
		if (isControlled && onFilterChange) {
			const isActive = currentActiveFilter?.id === filter.columnId && currentActiveFilter?.value === filter.value
			onFilterChange(isActive ? null : { id: filter.columnId as string, value: filter.value })
		} else {
			const existing = columnFilters.find((f) => f.id === filter.columnId)
			if (existing && existing.value === filter.value) {
				setColumnFilters((prev) => prev.filter((f) => f.id !== filter.columnId))
			} else {
				setColumnFilters([{ id: filter.columnId as string, value: filter.value }])
			}
		}
	}

	const handleResetFilters = () => {
		if (isControlled && onFilterChange) {
			onFilterChange(null)
		} else {
			setColumnFilters([])
		}
	}

	const filteredRowCount = table.getFilteredRowModel().rows.length
	const showPagination = pageSize && filteredRowCount > pageSize
	const pageCount = pageSize ? Math.ceil(filteredRowCount / pageSize) : 1

	// Calculate total count from filters if counts are provided
	const totalCount = filters?.reduce((sum, filter) => sum + (filter.count || 0), 0) || 0

	return (
		<div className={twMerge(clsx("w-full rounded-xl border border-border/60 shadow-sm overflow-hidden bg-background", className))}>
			{/* Filter Bar */}
			{filters && filters.length > 0 && (
				<div className="px-4 py-1.5 border-b border-border/60 bg-muted/40">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
						<div className="flex items-center gap-2">
							<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{filterLabel}</span>
							<div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40">
								<button
									type="button"
									onClick={handleResetFilters}
									aria-pressed={currentActiveFilter === null}
									className={clsx(
										"px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1",
										currentActiveFilter === null
											? "bg-background shadow-sm text-foreground ring-1 ring-border/20"
											: "text-muted-foreground hover:bg-accent hover:text-foreground"
									)}
								>
									Todos{totalCount > 0 ? ` (${totalCount})` : ''}
								</button>
								{filters.map((filter) => {
									const isActive = currentActiveFilter?.id === filter.columnId && currentActiveFilter?.value === filter.value
									return (
										<button
											key={`${String(filter.columnId)}-${filter.value}`}
											type="button"
											onClick={() => handleFilterClick(filter)}
											aria-pressed={isActive}
											className={clsx(
												"px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1",
												isActive
													? "bg-background shadow-sm text-foreground ring-1 ring-border/20"
													: "text-muted-foreground hover:bg-accent hover:text-foreground"
											)}
										>
											{filter.label}{filter.count !== undefined ? ` (${filter.count})` : ''}
										</button>
									)
								})}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Empty state when filters yield no results */}
			{table.getRowModel().rows.length === 0 ? (
				<div className="text-center py-12 bg-muted/10">
					<p className="text-sm font-medium text-muted-foreground">No hay resultados que coincidan con los filtros aplicados.</p>
				</div>
			) : (
				<>
					<div className="overflow-x-auto">
						<table className="w-full table-auto">
							<thead>
								{table.getHeaderGroups().map((headerGroup) => (
									<tr key={headerGroup.id} className="bg-muted/40">
										{headerGroup.headers.map((header, index) => {
											const canSort = header.column.getCanSort()
											const sortDirection = header.column.getIsSorted()
											const isFirstColumn = index === 0
											const columnWidth = header.column.columnDef.meta?.width

											return (
												<th
													key={header.id}
													scope="col"
													className={clsx(
														"text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 border-b border-border/60",
														isFirstColumn && "w-full",
														!isFirstColumn && !columnWidth && "whitespace-nowrap",
														columnWidth && "overflow-hidden text-ellipsis whitespace-nowrap",
														canSort && "cursor-pointer hover:bg-muted/60 transition-colors select-none"
													)}
													style={columnWidth ? { width: columnWidth, minWidth: columnWidth, maxWidth: columnWidth } : undefined}
													onClick={header.column.getToggleSortingHandler()}
													aria-sort={
														sortDirection === "asc"
															? "ascending"
															: sortDirection === "desc"
																? "descending"
																: "none"
													}
												>
													<div className="flex items-center gap-2">
														{header.isPlaceholder
															? null
															: flexRender(header.column.columnDef.header, header.getContext())}
														{canSort && (
															<span className="flex-shrink-0" aria-hidden="true">
																{sortDirection === "asc" ? (
																	<ArrowUp className="w-3.5 h-3.5" />
																) : sortDirection === "desc" ? (
																	<ArrowDown className="w-3.5 h-3.5" />
																) : (
																	<ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
																)}
															</span>
														)}
													</div>
												</th>
											)
										})}
									</tr>
								))}
							</thead>
							<tbody className="divide-y divide-border/40">
								{table.getRowModel().rows.map((row) => (
									<tr key={row.id} className="hover:bg-muted/20 transition-colors group">
										{row.getVisibleCells().map((cell, index) => {
											const isFirstColumn = index === 0
											return (
												<td
													key={cell.id}
													className={clsx(
														"px-4 py-3 text-sm",
														isFirstColumn && "w-full font-medium",
														!isFirstColumn && "whitespace-nowrap"
													)}
												>
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</td>
											)
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					{showPagination && (
						<div className="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-muted/40">
							<div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
								Mostrando <span className="text-foreground">{(pagination.pageIndex * pagination.pageSize) + 1} - {Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredRowCount)}</span> de <span className="text-foreground">{filteredRowCount}</span>
							</div>
							<div className="flex items-center gap-3">
								<button
									type="button"
									onClick={() => table.previousPage()}
									disabled={!table.getCanPreviousPage()}
									className="px-4 py-1.5 text-xs font-bold uppercase tracking-tight border border-border/60 rounded-md bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
								>
									Anterior
								</button>
								<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
									Página <span className="text-foreground">{pagination.pageIndex + 1}</span> de <span className="text-foreground">{pageCount}</span>
								</span>
								<button
									type="button"
									onClick={() => table.nextPage()}
									disabled={!table.getCanNextPage()}
									className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-border/60 rounded-md bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
								>
									Siguiente
								</button>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	)
}
