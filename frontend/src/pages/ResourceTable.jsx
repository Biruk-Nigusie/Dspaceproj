import { ChevronDownIcon, Download, DownloadIcon, FileTextIcon, Search, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { pdfjs } from "react-pdf";
import { useAuth } from "../contexts/AuthContext";
import { houseTypeOptions } from "../utils/constants";

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { PdfPreview } from "../components/PDFPreview";
import dspaceService from "../services/dspaceService";

export default function ResourceTable({
	resources,
	loading,
	onCatalogClick,
	columnFilters,
	onColumnFilterChange,
	pagination,
	onPageChange,
	onPageSizeChange,
}) {
	const { user } = useAuth();
	const isAuthenticated = !!user;

	const [showPreviewModal, setShowPreviewModal] = useState(false);
	const [primaryBitstream, setPrimaryBitstream] = useState(null);
	const [bundledBitstreams, setBundledBitstreams] = useState(null);
	const [selectedBitstream, setSelectedBitstream] = useState(null);
	const [activePreviewBitstream, setActivePreviewBitstream] = useState(null);

	const allBitstreams = primaryBitstream
		? [primaryBitstream, ...(bundledBitstreams || [])]
		: bundledBitstreams || [];

	const isImage = (b) => {
		if (!b?.name) return false;
		return /\.(jpe?g|png|gif|svg|webp|bmp)$/i.test(b.name);
	};

	const isPdf = (b) => {
		if (!b?.name) return false;
		return /\.pdf$/i.test(b.name);
	};

	// Helper to pick a primary identifier for display and to render grouped identifiers
	const renderPrimaryIdentifier = (resource) => {
		const order = ["filenumber", "issn", "other"];
		if (resource.identifierGroups) {
			for (const g of order) {
				if (
					resource.identifierGroups[g] &&
					resource.identifierGroups[g].length > 0
				)
					return resource.identifierGroups[g][0];
			}
		}
		return resource.identifiers?.[0] || resource.isbn || resource.issn || "—";
	};

	const renderIdentifierPopover = (resource) => {
		if (!resource.identifierGroups) return null;
		const labels = {
			issn: "ISSN",
			filenumber: "File Number",
			other: "Other",
		};
		const ordered = ["filenumber", "issn", "other"];
		return (
			<div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute left-0 z-10 w-64 bg-white border border-gray-200 p-2 text-xs rounded shadow-lg">
				{ordered.map((g) =>
					resource.identifierGroups[g] ? (
						<div key={g} className="mb-2">
							<div className="font-semibold text-[11px] text-gray-600">
								{labels[g]}
							</div>
							{resource.identifierGroups[g].map((id, idx) => (
								<div key={idx} className="truncate text-gray-800">
									{id}
								</div>
							))}
						</div>
					) : null,
				)}
			</div>
		);
	};

	const handleColumnFilterChange = (field, type, value) => {
		onColumnFilterChange((prev) => ({
			...prev,
			[field]: { ...prev[field], [type]: value },
		}));
	};

	const handlePreview = async (resource, e) => {
		e.stopPropagation();

		if (!resource.originalBundleId) {
			console.warn("No bitstream links found on resource");
			return;
		}

		const res = await dspaceService.getBitstreams(resource.originalBundleId);
		if (res.primaryBitstream || res.bundledBitstreams) {
			setPrimaryBitstream(res.primaryBitstream);
			setBundledBitstreams(
				res.bundledBitstreams?._embedded?.bitstreams.filter(
					(bitstream) => bitstream.uuid !== res?.primaryBitstream?.uuid,
				) ?? [],
			);

			setShowPreviewModal(true);
		}
	};

	const handleRowClick = (resource) => {
		if (resource.source === "koha") {
			window.open(
				`http://127.0.0.1:8085/cgi-bin/koha/catalogue/detail.pl?biblionumber=${resource.external_id}`,
				"_blank",
			);
		} else if (resource.source === "dspace") {
			const isHandle = resource.external_id?.includes("/");
			const path = isHandle ? "handle" : "items";
			window.open(
				`${import.meta.env.VITE_DSPACE_FRONTEND_URL}/${path}/${resource.external_id
				}`,
				"_blank",
			);
		}
	};

	const operators = [
		{ value: "equals", label: "Equals" },
		{ value: "notequals", label: "Not Equals" },
		{ value: "contains", label: "Contains" },
		{ value: "notcontains", label: "Not Contains" },
		// { value: "authority", label: "Authority" },
		// { value: "notauthority", label: "Not Authority" },
		// { value: "query", label: "Query" },
	];

	useEffect(() => {
		if (bundledBitstreams?.length > 0) {
			setSelectedBitstream(bundledBitstreams[0]);
		}
	}, [bundledBitstreams]);

	useEffect(() => {
		if (showPreviewModal && primaryBitstream) {
			setActivePreviewBitstream(primaryBitstream);
		}
	}, [showPreviewModal, primaryBitstream]);

	return (
		<div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
			{/* Search Filter Grid - Always Visible */}
			<div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
				<div className="flex items-center justify-between mb-4">
					<h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
						በዝርዝር ይፈልጉ (Detail Search)
					</h4>
					{(columnFilters.houseNumber?.value ||
						columnFilters.houseType?.value ||
						columnFilters.husband?.value ||
						columnFilters.wife?.value) && (
							<button
								type="button"
								onClick={() =>
									onColumnFilterChange({
										houseType: { value: "", operator: "equals" },
										houseNumber: { value: "", operator: "contains" },
										husband: { value: "", operator: "contains" },
										wife: { value: "", operator: "contains" },
									})
								}
								className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1 bg-red-50 px-2 py-1 rounded border border-red-100 transition-colors"
							>
								<XIcon className="w-3 h-3" /> Clear Filters
							</button>
						)}
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
					<div>
						<div className="flex items-center justify-between mb-1">
							<label
								htmlFor="filter-itemidentifier"
								className="block text-xs font-medium text-gray-500"
							>
								Identifier
							</label>
							<select
								value={columnFilters.itemidentifier?.operator || "equals"}
								onChange={(e) =>
									handleColumnFilterChange(
										"itemidentifier",
										"operator",
										e.target.value,
									)
								}
								className="text-[10px] bg-transparent border-none text-blue-600 font-medium cursor-pointer focus:ring-0 p-0"
							>
								{operators.map((op) => (
									<option key={op.value} value={op.value}>
										{op.label}
									</option>
								))}
							</select>
						</div>
						<input
							id="filter-itemidentifier"
							type="text"
							placeholder="e.g. 123"
							value={columnFilters.itemidentifier?.value || ""}
							onChange={(e) =>
								handleColumnFilterChange(
									"itemidentifier",
									"value",
									e.target.value,
								)
							}
							className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
						/>
					</div>
					<div>
						<div className="flex items-center justify-between mb-1">
							<label
								htmlFor="filter-house-number"
								className="block text-xs font-medium text-gray-500"
							>
								House Number
							</label>
							<select
								value={columnFilters.houseNumber?.operator || "contains"}
								onChange={(e) =>
									handleColumnFilterChange(
										"houseNumber",
										"operator",
										e.target.value,
									)
								}
								className="text-[10px] bg-transparent border-none text-blue-600 font-medium cursor-pointer focus:ring-0 p-0"
							>
								{operators.map((op) => (
									<option key={op.value} value={op.value}>
										{op.label}
									</option>
								))}
							</select>
						</div>
						<input
							id="filter-house-number"
							type="text"
							placeholder="e.g. 123"
							value={columnFilters.houseNumber?.value || ""}
							onChange={(e) =>
								handleColumnFilterChange("houseNumber", "value", e.target.value)
							}
							className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
						/>
					</div>
					<div>
						<div className="flex items-center justify-between mb-1">
							<label
								htmlFor="filter-house-type"
								className="block text-xs font-medium text-gray-500"
							>
								House Type
							</label>
							<select
								value={columnFilters.houseType?.operator || "equals"}
								onChange={(e) =>
									handleColumnFilterChange(
										"houseType",
										"operator",
										e.target.value,
									)
								}
								className="text-[10px] bg-transparent border-none text-blue-600 font-medium cursor-pointer focus:ring-0 p-0"
							>
								{operators.map((op) => (
									<option key={op.value} value={op.value}>
										{op.label}
									</option>
								))}
							</select>
						</div>
						<select
							id="filter-house-type"
							value={columnFilters.houseType?.value || ""}
							onChange={(e) =>
								handleColumnFilterChange("houseType", "value", e.target.value)
							}
							className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
						>
							<option value="">All House Types</option>
							{houseTypeOptions.map((option) => (
								<option key={option} value={option}>
									{option}
								</option>
							))}
						</select>
					</div>
					<div>
						<div className="flex items-center justify-between mb-1">
							<label
								htmlFor="filter-husband"
								className="block text-xs font-medium text-gray-500"
							>
								Husband Name
							</label>
							<select
								value={columnFilters.husband?.operator || "contains"}
								onChange={(e) =>
									handleColumnFilterChange(
										"husband",
										"operator",
										e.target.value,
									)
								}
								className="text-[10px] bg-transparent border-none text-blue-600 font-medium cursor-pointer focus:ring-0 p-0"
							>
								{operators.map((op) => (
									<option key={op.value} value={op.value}>
										{op.label}
									</option>
								))}
							</select>
						</div>
						<input
							id="filter-husband"
							type="text"
							placeholder="Search husband..."
							value={columnFilters.husband?.value || ""}
							onChange={(e) =>
								handleColumnFilterChange("husband", "value", e.target.value)
							}
							className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
						/>
					</div>
					<div>
						<div className="flex items-center justify-between mb-1">
							<label
								htmlFor="filter-wife"
								className="block text-xs font-medium text-gray-500"
							>
								Wife Name
							</label>
							<select
								value={columnFilters.wife?.operator || "contains"}
								onChange={(e) =>
									handleColumnFilterChange("wife", "operator", e.target.value)
								}
								className="text-[10px] bg-transparent border-none text-blue-600 font-medium cursor-pointer focus:ring-0 p-0"
							>
								{operators.map((op) => (
									<option key={op.value} value={op.value}>
										{op.label}
									</option>
								))}
							</select>
						</div>
						<input
							id="filter-wife"
							type="text"
							placeholder="Search wife..."
							value={columnFilters.wife?.value || ""}
							onChange={(e) =>
								handleColumnFilterChange("wife", "value", e.target.value)
							}
							className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
						/>
					</div>
				</div>
			</div>

			{loading ? (
				<div className="text-center py-12">
					<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800" />
					<p className="mt-4 text-gray-600 text-lg">
						መዛግብት እና መጻሕፍት በመጫን ላይ...
					</p>
				</div>
			) : resources.length === 0 ? (
				<div className="text-center py-12 border border-blue-50 bg-blue-50/30 rounded-lg">
					<FileTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
					<h3 className="text-xl font-semibold text-gray-900 mb-2">
						ምንም መዝገቦች አልተገኙም
					</h3>
					<p className="text-gray-600 mb-4">
						የፍለጋ መስፈርቶችዎን ማስተካከል ወይም በምድብ ማሰስ ይሞክሩ
					</p>
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Sub City
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Woreda
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									House Number
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Identifier
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									House Type
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Husband
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Wife
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Registration Date
								</th>
								<th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{resources.map((resource) => (
								<tr
									key={resource.id}
									className="hover:bg-gray-50 cursor-pointer"
									onClick={() => handleRowClick(resource)}
								>
									<td className="px-6 py-4 max-w-xs">
										{resource.parentCommunity || "—"}
									</td>
									<td className="px-6 py-4 max-w-xs">
										{resource.owningCollection || "—"}
									</td>
									<td className="px-6 py-4 text-sm text-gray-700">
										{resource.houseNumber || "—"}
									</td>
									<td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
										<div className="group max-w-48">
											<span className="block truncate">
												{renderPrimaryIdentifier(resource)}
											</span>
											<div className="absolute">
												{resource.identifierGroups &&
													Object.keys(resource.identifierGroups).length > 0 &&
													renderIdentifierPopover(resource)}
											</div>
										</div>
									</td>
									<td className="px-6 py-4 text-sm text-gray-700">
										{resource.houseType || "—"}
									</td>
									<td className="px-6 py-4 text-sm text-gray-700">
										{resource.husband || "—"}
									</td>
									<td className="px-6 py-4 text-sm text-gray-700">
										{resource.wife || "—"}
									</td>
									<td className="px-6 py-4 text-sm text-gray-700">
										{resource.dateOfRegistration || "—"}
									</td>
									<td className="px-6 py-4 text-center">
										<div className="flex items-center justify-center space-x-2">
											{resource.source === "dspace" && (
												<>
													<button
														type="button"
														onClick={(e) => handlePreview(resource, e)}
														className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center cursor-pointer"
													>
														Preview
													</button>
													{isAuthenticated && (
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																onCatalogClick(resource);
															}}
															className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 cursor-pointer"
														>
															Catalog
														</button>
													)}
												</>
											)}
											{resource.source === "koha" && (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														handleRowClick(resource);
													}}
													className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 cursor-pointer flex items-center gap-1"
												>
													<Search className="w-3 h-3" />
													View In Catalog
												</button>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Pagination Controls */}
			{resources.length > 0 && (
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-4 border-t border-border rounded-b-lg bg-background">
					{/* Results info */}
					<div className="text-sm text-muted-foreground text-center sm:text-left">
						Showing{" "}
						<span className="font-semibold text-foreground">
							{pagination.number * pagination.size + 1}
						</span>{" "}
						to{" "}
						<span className="font-semibold text-foreground">
							{Math.min(
								(pagination.number + 1) * pagination.size,
								pagination.totalElements,
							)}
						</span>{" "}
						of{" "}
						<span className="font-semibold text-foreground">
							{pagination.totalElements}
						</span>{" "}
						results
					</div>

					{/* Controls */}
					<div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
						{/* Rows per page */}
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground whitespace-nowrap">
								Rows per page:
							</span>
							<select
								value={pagination.size}
								onChange={(e) => onPageSizeChange(Number(e.target.value))}
								className="text-sm bg-background border border-border rounded-md px-3 py-1.5 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none cursor-pointer transition-all hover:border-primary"
							>
								{[5, 10, 20, 50, 100].map((size) => (
									<option key={size} value={size}>
										{size}
									</option>
								))}
							</select>
						</div>

						{/* Pagination buttons */}
						<div className="flex items-center gap-2">
							{/* Previous */}
							<button
								type="button"
								onClick={() => onPageChange(pagination.number - 1)}
								disabled={pagination.number === 0}
								className="px-4 py-2 text-sm font-medium rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-sm"
							>
								Previous
							</button>

							{/* Page indicator */}
							<div className="flex items-center gap-1">
								<span className="min-w-10 text-center px-3 py-2 text-sm font-semibold text-foreground bg-muted border border-border rounded-md">
									{pagination.number + 1}
								</span>

								<span className="text-muted-foreground text-sm">/</span>

								<span className="min-w-10 text-center px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-md bg-background">
									{pagination.totalPages}
								</span>
							</div>

							{/* Next */}
							<button
								type="button"
								onClick={() => onPageChange(pagination.number + 1)}
								disabled={pagination.number >= pagination.totalPages - 1}
								className="px-4 py-2 text-sm font-medium rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-sm"
							>
								Next
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Preview Modal with Backdrop */}
			{showPreviewModal && (
				<div
					className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
					role="dialog"
					aria-modal="true"
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setShowPreviewModal(false);
							setPrimaryBitstream(null);
							setBundledBitstreams([]);
						}
					}}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							setShowPreviewModal(false);
							setPrimaryBitstream(null);
							setBundledBitstreams([]);
						}
					}}
				>
					<div
						className="relative bg-foreground rounded-xl shadow-2xl w-[95vw] h-[95vh] flex overflow-hidden"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Mobile: Single panel with dropdown */}
						<div className="lg:hidden flex flex-col w-full h-full overflow-hidden">
							<div className="flex flex-col min-w-0 bg-primary text-primary-foreground px-4 py-3 border-b">
								<div className="flex items-center justify-between gap-2">
									<div className="relative inline-block flex-1">
										<button
											type="button"
											className="w-full flex items-center justify-between px-3 py-2 text-left bg-primary/10 hover:bg-primary/20 text-primary-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
										>
											<span className="flex items-center gap-3">
												<ChevronDownIcon />
												<div className="flex-1 min-w-0">
													<div className="font-semibold truncate">
														{activePreviewBitstream?.name || "Preview"}
													</div>
													<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-90">
														{activePreviewBitstream?.metadata?.["crvs.documentType"]?.[0]
															?.value && (
																<span>
																	<span className="font-medium">Type:</span>{" "}
																	{
																		activePreviewBitstream.metadata["crvs.documentType"][0]
																			.value
																	}
																</span>
															)}
														{activePreviewBitstream?.metadata?.["crvs.document.status"]?.[0]
															?.value && (
																<span>
																	<span className="font-medium">Status:</span>{" "}
																	{
																		activePreviewBitstream.metadata["crvs.document.status"][0]
																			.value
																	}
																</span>
															)}
														{activePreviewBitstream?.sizeBytes && (
															<span>
																<span className="font-medium">Size:</span>{" "}
																{(activePreviewBitstream.sizeBytes / 1024).toFixed(1)} KB
															</span>
														)}
													</div>
												</div>
											</span>
										</button>
										<select
											value={activePreviewBitstream?.uuid}
											onChange={(e) =>
												setActivePreviewBitstream(
													allBitstreams.find((b) => b.uuid === e.target.value),
												)
											}
											className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
										>
											{allBitstreams.map((b, idx) => (
												<option key={b.uuid} value={b.uuid}>
													{idx === 0 ? "Primary: " : `File ${idx}: `}{b.name}
												</option>
											))}
										</select>
									</div>
									{activePreviewBitstream && (
										<a
											href={`/api/resources/dspace-bitstream/${activePreviewBitstream.uuid}`}
											target="_blank"
											rel="noopener noreferrer"
											className="p-1.5 rounded hover:bg-white/20 transition-colors"
											title="Download"
										>
											<Download className="w-4 h-4" />
										</a>
									)}
								</div>
							</div>
							<div className="flex-1 overflow-auto p-4 bg-white flex flex-col">
								<div className="flex-1 overflow-auto flex items-center justify-center">
									{activePreviewBitstream ? (
										isImage(activePreviewBitstream) ? (
											<img
												src={`/api/resources/dspace-bitstream/${activePreviewBitstream?.uuid}`}
												alt={activePreviewBitstream?.name}
												className="max-h-[70vh] max-w-full object-contain rounded-md shadow-sm"
											/>
										) : isPdf(activePreviewBitstream) ? (
											<PdfPreview
												fileUrl={`/api/resources/dspace-bitstream/${activePreviewBitstream?.uuid}`}
											/>
										) : (
											<div className="text-sm text-muted-foreground">
												<div className="font-medium mb-1">
													{activePreviewBitstream?.name}
												</div>
												<div className="text-xs">
													Type: {activePreviewBitstream?.format || "Unknown"}
												</div>
											</div>
										)
									) : (
										<div className="text-muted-foreground">No file selected</div>
									)}
								</div>
							</div>
						</div>

						{/* Desktop: Two panels side by side */}
						<div className="hidden lg:flex w-full h-full">
							{/* Left: Primary Bitstream */}
							<div className="flex flex-col w-1/2 h-full border-r overflow-hidden">
								<div className="h-18 flex flex-col justify-center border-b bg-primary text-primary-foreground px-4 py-3">
									<div className="flex items-center gap-2">
										<h2 className="text-lg font-semibold truncate text-ellipsis line-clamp-1">
											{primaryBitstream?.name || "Preview"}
										</h2>
										{primaryBitstream && (
											<a
												href={`/api/resources/dspace-bitstream/${primaryBitstream.uuid}`}
												target="_blank"
												rel="noopener noreferrer"
												className="p-1.5 rounded hover:bg-white/20 transition-colors"
												title="Download"
											>
												<Download className="w-4 h-4" />
											</a>
										)}
									</div>
									<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-90 mt-1">
										{primaryBitstream?.metadata?.["crvs.documentType"]?.[0]
											?.value && (
												<span>
													<span className="font-medium">Type:</span>{" "}
													{
														primaryBitstream.metadata["crvs.documentType"][0]
															.value
													}
												</span>
											)}
										{primaryBitstream?.metadata?.["crvs.document.status"]?.[0]
											?.value && (
												<span>
													<span className="font-medium">Status:</span>{" "}
													{
														primaryBitstream.metadata["crvs.document.status"][0]
															.value
													}
												</span>
											)}
										{primaryBitstream?.sizeBytes && (
											<span>
												<span className="font-medium">Size:</span>{" "}
												{(primaryBitstream.sizeBytes / 1024).toFixed(1)} KB
											</span>
										)}
									</div>
								</div>
								<div className="flex-1 overflow-auto bg-white flex flex-col">
									<div className="flex-1 overflow-auto flex items-center justify-center">
										{primaryBitstream ? (
											isImage(primaryBitstream) ? (
												<img
													src={`/api/resources/dspace-bitstream/${primaryBitstream?.uuid}`}
													alt={primaryBitstream?.name}
													className="max-h-[70vh] max-w-full object-contain rounded-md shadow-sm"
												/>
											) : isPdf(primaryBitstream) ? (
												<PdfPreview
													fileUrl={`/api/resources/dspace-bitstream/${primaryBitstream?.uuid}`}
												/>
											) : (
												<div className="text-sm text-muted-foreground">
													<div className="font-medium mb-1">
														{primaryBitstream?.name}
													</div>
													<div className="text-xs">
														Type: {primaryBitstream?.format || "Unknown"}
													</div>
												</div>
											)
										) : (
											<div className="text-muted-foreground">Primary file not found</div>
										)}
									</div>
								</div>
							</div>

							{/* Right: Bundled Bitstreams */}
							<div className="flex flex-col w-1/2 h-full overflow-hidden">
								<div className="h-18 flex flex-col min-w-0 bg-primary text-primary-foreground px-4 py-3 border-b">
									<div className="flex items-start">
										<div className="relative inline-block">
											<button
												type="button"
												className="w-full flex items-center justify-between px-3 py-0.5 text-left bg-primary/10 hover:bg-primary/20 text-primary-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
											>
												<span className="flex items-center gap-4">
													<ChevronDownIcon />
													<div>
														<h2 className="text-lg font-semibold truncate text-ellipsis line-clamp-1">
															{bundledBitstreams?.length > 0
																? selectedBitstream?.name || primaryBitstream?.name
																: "No Additional Files"}
														</h2>
														{bundledBitstreams?.length > 0 && (
															<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-90 text-ellipsis line-clamp-1">
																{selectedBitstream?.metadata?.[
																	"crvs.documentType"
																]?.[0]?.value && (
																		<span>
																			<span className="font-medium">Type:</span>{" "}
																			{
																				selectedBitstream.metadata[
																					"crvs.documentType"
																				][0].value
																			}
																		</span>
																	)}
																{selectedBitstream?.metadata?.[
																	"crvs.document.status"
																]?.[0]?.value && (
																		<span>
																			<span className="font-medium">Status:</span>{" "}
																			{
																				selectedBitstream.metadata[
																					"crvs.document.status"
																				][0].value
																			}
																		</span>
																	)}
																{selectedBitstream?.sizeBytes && (
																	<span>
																		<span className="font-medium">Size:</span>{" "}
																		{(selectedBitstream.sizeBytes / 1024).toFixed(
																			1,
																		)}{" "}
																		KB
																	</span>
																)}
															</div>
														)}
													</div>
												</span>
											</button>
											{bundledBitstreams?.length > 0 && (
												<select
													value={selectedBitstream?.uuid}
													onChange={(e) =>
														setSelectedBitstream(
															bundledBitstreams.find(
																(b) => b.uuid === e.target.value,
															),
														)
													}
													className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
												>
													{bundledBitstreams.map((b) => (
														<option key={b.uuid} value={b.uuid}>
															{b.name}
														</option>
													))}
												</select>
											)}
										</div>
										{bundledBitstreams?.length > 0 && selectedBitstream && (
											<a
												href={`/api/resources/dspace-bitstream/${selectedBitstream.uuid}`}
												target="_blank"
												rel="noopener noreferrer"
												className="p-1.5 rounded hover:bg-white/20 transition-colors mt-0.5"
												title="Download"
											>
												<DownloadIcon className="w-4 h-4" />
											</a>
										)}
									</div>
								</div>
								<div className="flex-1 overflow-auto bg-white flex flex-col">
									<div className="flex-1 overflow-auto flex items-center justify-center">
										{bundledBitstreams?.length > 0 ? (
											isImage(selectedBitstream) ? (
												<img
													src={`/api/resources/dspace-bitstream/${selectedBitstream?.uuid}`}
													alt={selectedBitstream?.name}
													className="max-h-[70vh] max-w-full object-contain rounded-md shadow-sm"
												/>
											) : isPdf(selectedBitstream) ? (
												<PdfPreview
													fileUrl={`/api/resources/dspace-bitstream/${selectedBitstream?.uuid}`}
												/>
											) : (
												<div className="text-sm text-muted-foreground">
													<div className="font-medium mb-1">
														{selectedBitstream?.name}
													</div>
													<div className="text-xs">
														Type: {selectedBitstream?.format || "Unknown"}
													</div>
												</div>
											)
										) : (
											<div className="text-muted-foreground">No additional files</div>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* Close Button */}
						<button
							type="button"
							onClick={() => {
								setShowPreviewModal(false);
								setPrimaryBitstream(null);
								setBundledBitstreams([]);
							}}
							className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white text-lg font-bold flex items-center justify-center transition-colors"
						>
							×
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
