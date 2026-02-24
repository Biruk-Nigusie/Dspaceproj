"use client";

import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const getCommonPinningStyles = (column) => {
	const isPinned = column.getIsPinned();
	const isLastLeftPinnedColumn =
		isPinned === "left" && column.getIsLastColumn("left");
	const isFirstRightPinnedColumn =
		isPinned === "right" && column.getIsFirstColumn("right");

	return {
		boxShadow: isLastLeftPinnedColumn
			? "-1px 0 1px -1px gray inset"
			: isFirstRightPinnedColumn
				? "1px 0 1px -1px gray inset"
				: undefined,
		left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
		right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
		opacity: isPinned ? 0.95 : 1,
		position: isPinned ? "sticky" : "relative",
		zIndex: isPinned ? 1 : 0,
		backgroundColor: isPinned ? "var(--background) " : "transparent",
	};
};

export function DataTable({ columns, data, meta }) {
	const table = useReactTable({
		data,
		columns,
		initialState: {
			columnPinning: {
				right: ["actions"],
			},
		},
		getCoreRowModel: getCoreRowModel(),
		meta,
	});

	return (
		<div className="overflow-hidden rounded-md">
			<Table>
				<TableHeader className="bg-muted/50">
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => {
								return (
									<TableHead
										key={header.id}
										className="text-muted-foreground/80"
										style={getCommonPinningStyles(header.column)}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								);
							})}
						</TableRow>
					))}
				</TableHeader>
				<TableBody className="divide-y divide-accent">
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow
								key={row.id}
								data-state={row.getIsSelected() && "selected"}
								className="even:bg-muted/40"
							>
								{row.getVisibleCells().map((cell) => (
									<TableCell
										key={cell.id}
										style={getCommonPinningStyles(cell.column)}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={columns.length} className="h-24 text-center">
								No results.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
