import { useState } from "react"
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	flexRender,
	type ColumnDef,
} from "@tanstack/react-table"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

declare module "@tanstack/react-table" {
	interface ColumnMeta<TData, TValue> {
		width?: string
	}
}

export interface TableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	className?: string
}

export function Table<TData, TValue>({ columns, data, className }: TableProps<TData, TValue>) {
	const [sorting, setSorting] = useState<SortingState>([])

	// TanStack Table's useReactTable returns functions that cannot be memoized safely
	// This is a known limitation and the warning can be safely ignored
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: {
			sorting,
		},
	})

	return (
		<div className={twMerge(clsx("w-full overflow-hidden rounded-xl border border-border/60 shadow-sm", className))}>
			<table className="w-full table-auto">
				<thead className="bg-muted/40">
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
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
											"text-left px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60",
											isFirstColumn && "w-full",
											!isFirstColumn && !columnWidth && "whitespace-nowrap",
											columnWidth && "overflow-hidden text-ellipsis whitespace-nowrap",
											canSort && "cursor-pointer hover:bg-muted/80 transition-colors select-none"
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
											"px-4 py-3",
											isFirstColumn && "w-full",
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
	)
}
