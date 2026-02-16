import { FileTextIcon, Search, XIcon } from "lucide-react";
import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useAuth } from "../contexts/AuthContext";
import { houseTypeOptions } from "../utils/constants";

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

const ResourceTable = ({
	resources,
	loading,
	onCatalogClick,
	columnFilters,
	onColumnFilterChange,
}) => {
	const { user } = useAuth();
	const isAuthenticated = !!user;
	// ... existing preview states ...
	const [previewLoading] = useState({});
	const [showPreviewModal, setShowPreviewModal] = useState(false);
	const [previewUrl, setPreviewUrl] = useState("");
	const [numPages, setNumPages] = useState(null);
	const [pageNumber, setPageNumber] = useState(1);
	const [scale, setScale] = useState(1.0);
	const [pdfLoading, setPdfLoading] = useState(true);

	const handleColumnFilterChange = (field, type, value) => {
		onColumnFilterChange((prev) => ({
			...prev,
			[field]: { ...prev[field], [type]: value },
		}));
	};

	function onDocumentLoadSuccess({ numPages }) {
		setNumPages(numPages);
		setPdfLoading(false);
	}

	const handleDownload = () => {
		if (!previewUrl) return;
		const link = document.createElement("a");
		link.href = previewUrl;
		// Extract filename from URL or use a default
		const filename = previewUrl.split("/").pop() || "document.pdf";
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handlePreview = async (resource, e) => {
		e.stopPropagation();
		let url = "";
		if (resource.source === "dspace") {
			if (resource.preview_url) {
				url = resource.preview_url;
			} else if (resource.external_id) {
				url = `/api/resources/dspace-bitstream/${resource.external_id}/`;
			} else if (resource.id?.startsWith("dspace_")) {
				const itemUuid = resource.id.replace("dspace_", "");
				url = `/api/resources/dspace-bitstream/${itemUuid}/`;
			}
		}

		if (url) {
			setPreviewUrl(url);
			setPageNumber(1);
			setPdfLoading(true);
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
				`${import.meta.env.VITE_DSPACE_FRONTEND_URL}/${path}/${
					resource.external_id
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
										{resource.community || "—"}
									</td>
									<td className="px-6 py-4 max-w-xs">
										{resource.collection || "—"}
									</td>
									<td className="px-6 py-4 text-sm text-gray-700">
										{resource.houseNumber || "—"}
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
														disabled={previewLoading[resource.id]}
														className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center cursor-pointer"
													>
														{previewLoading[resource.id] ? (
															<>
																<div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
																Loading...
															</>
														) : (
															"Preview"
														)}
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
			{/* Full-screen Preview Modal */}
			{/* Full-screen Preview Modal with react-pdf */}
			{showPreviewModal && (
				<div className="fixed inset-0 z-50 flex flex-col bg-black bg-opacity-95 overflow-hidden">
					{/* Modal Header */}
					<div className="flex justify-between items-center px-6 py-4 bg-gray-900 border-b border-gray-800 text-white z-10 shadow-lg">
						<div className="flex items-center gap-4">
							<h3 className="text-lg font-semibold truncate max-w-md">
								{resources.find(
									(r) =>
										r.id ===
											Object.keys(previewLoading).find((id) =>
												previewUrl.includes(id),
											) || {},
								)?.title || "Document Preview"}
							</h3>
							<div className="flex items-center bg-gray-800 rounded-lg px-2 py-1 gap-4 text-sm">
								<button
									type="button"
									onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
									disabled={pageNumber <= 1}
									className="hover:text-blue-400 disabled:opacity-30 disabled:hover:text-white transition-colors cursor-pointer"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-5 w-5"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<title>Previous Page</title>
										<path
											fillRule="evenodd"
											d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
											clipRule="evenodd"
										/>
									</svg>
								</button>
								<span className="font-medium whitespace-nowrap">
									Page {pageNumber} / {numPages || "--"}
								</span>
								<button
									type="button"
									onClick={() =>
										setPageNumber((prev) => Math.min(prev + 1, numPages))
									}
									disabled={pageNumber >= numPages}
									className="hover:text-blue-400 disabled:opacity-30 disabled:hover:text-white transition-colors cursor-pointer"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-5 w-5"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<title>Next Page</title>
										<path
											fillRule="evenodd"
											d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
											clipRule="evenodd"
										/>
									</svg>
								</button>
							</div>

							<div className="h-6 w-px bg-gray-700 mx-2" />

							<div className="flex items-center bg-gray-800 rounded-lg px-2 py-1 gap-4 text-sm">
								<button
									type="button"
									onClick={() => setScale((prev) => Math.max(prev - 0.1, 0.5))}
									className="hover:text-blue-400 transition-colors cursor-pointer"
									title="Zoom Out"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-5 w-5"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<title>Zoom Out</title>
										<path
											fillRule="evenodd"
											d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
											clipRule="evenodd"
										/>
									</svg>
								</button>
								<span className="font-medium w-12 text-center">
									{Math.round(scale * 100)}%
								</span>
								<button
									type="button"
									onClick={() => setScale((prev) => Math.min(prev + 0.1, 3.0))}
									className="hover:text-blue-400 transition-colors cursor-pointer"
									title="Zoom In"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-5 w-5"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<title>Zoom In</title>
										<path
											fillRule="evenodd"
											d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
											clipRule="evenodd"
										/>
									</svg>
								</button>
							</div>

							<div className="h-6 w-px bg-gray-700 mx-2" />

							<button
								type="button"
								onClick={handleDownload}
								className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
								title="Download File"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-4 w-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<title>Download Document</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
									/>
								</svg>
								Download
							</button>
						</div>

						<button
							type="button"
							onClick={() => setShowPreviewModal(false)}
							className="p-2 hover:bg-red-600/30 text-gray-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
							aria-label="Close preview"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<title>Close</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					{/* Document Content */}
					<div className="flex-1 overflow-auto bg-gray-100 dark:bg-zinc-900 scroll-smooth">
						<div className="flex flex-col items-center py-8 min-h-full">
							{pdfLoading && (
								<div className="flex flex-col items-center justify-center p-12">
									<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
									<p className="mt-4 text-gray-600 font-medium">
										መረጃው በመጫን ላይ ነው...
									</p>
								</div>
							)}
							<div
								className={`transition-opacity duration-300 ${
									pdfLoading ? "opacity-0 h-0" : "opacity-100 shadow-2xl"
								}`}
							>
								<Document
									file={previewUrl}
									onLoadSuccess={onDocumentLoadSuccess}
									loading={null}
									onLoadError={(error) =>
										console.error("PDF Load Error:", error)
									}
								>
									<Page
										pageNumber={pageNumber}
										scale={scale}
										renderAnnotationLayer={true}
										renderTextLayer={true}
									/>
								</Document>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ResourceTable;
