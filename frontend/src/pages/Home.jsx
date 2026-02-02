import axios from "axios";
import {
	AlertCircle,
	BarChart3,
	Book,
	CheckCircle,
	Download,
	MapPin,
	Search,
	Users,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import HowItWorks from "../components/HowItWorks";
import MetadataTreeFilter from "../components/MetadataTreeFilter";
import Card from "../components/UI/Card";
import dspaceService from "../services/dspaceService";
import { ORG_NAME } from "../utils/constants";
import CatalogModal from "./CatalogModal";
import ResourceTable from "./ResourceTable";

const Home = () => {
	const [searchQuery, setSearchQuery] = useState("");
	const [allResources, setAllResources] = useState([]); // For all resources (mixed)
	const [catalogedResources, setCatalogedResources] = useState([]); // For Koha cataloged items
	const [dspaceItems, setDspaceItems] = useState([]); // For DSpace items fetched directly
	const [loading, setLoading] = useState(false);
	const [showCatalogModal, setShowCatalogModal] = useState(false);
	const [catalogData, setCatalogData] = useState({
		title: "",
		authors: "",
		dspace_url: "",
		resource_type: "eBook",
		year: "",
		publisher: "",
		isbn_issn: "",
		language: "English",
		subject_keywords: "",
		description: "",
		call_number: "",
		access_note: "Open access",
		content_type: "Text",
		format: "PDF",
		current_library: "",
		barcode: "",
		marc_fields: {
			"000": "",
			"001": "",
			"003": "",
			"005": "",
			"006": "",
			"007": "",
			"008": "",
			"010a": "",
			"015a": "",
			"016a": "",
			"020a": "",
			"022a": "",
			"024a": "",
			"027a": "",
			"028a": "",
			"035a": "",
			"037a": "",
			"040a": "",
			"041a": "",
			"045a": "",
			"047a": "",
			"048a": "",
			"050a": "",
			"074a": "",
			"082a": "",
			"086a": "",
		},
	});

	const [stats, setStats] = useState({
		totalResources: 0,
		monthlyDownloads: 0,
		activeUsers: 0,
		communities: 0,
	});

	const [collections, setCollections] = useState([]);
	const [selectedCollections, setSelectedCollections] = useState([]);
	const [activeFilters, setActiveFilters] = useState({});
	const [displayMode, setDisplayMode] = useState("digital"); // "digital", "cataloged"
	const [currentPage, setCurrentPage] = useState(1);
	const pageSize = 10;
	const [dspacePagination, setDspacePagination] = useState({
		page: 0,
		size: 10,
		totalPages: 0,
		totalElements: 0,
	});


	// Fetch all resources (using DSpace search)
	const fetchAllResources = useCallback(async (query = "") => {
		setLoading(true);
		try {
			// Use DSpace service to search
			const results = await dspaceService.searchItems(query);

			// Transform DSpace items to common resource format
			// Filter out collections - only include actual items
			const mappedResults = await Promise.all(
				results.map(async (item) => {
					const owningCollectionLink =
						item._embedded?.indexableObject?._links.owningCollection?.href.split(
							"/server/api",
						)[1];

					const owningCollection = await dspaceService.getOwningCollection(
						owningCollectionLink,
					);

					const parentCommunityLink =
						owningCollection?._links.parentCommunity?.href.split("/server/api")[1];

					const parentCommunity = await dspaceService.getParentCommunity(
						parentCommunityLink,
					);

					const metadata = item._embedded?.indexableObject?.metadata || {};

					const getVal = (key) => metadata[key]?.[0]?.value || "";
					const getValList = (key) =>
						metadata[key]?.map((m) => m.value).join(", ") || "";

					return {
						id: item._embedded?.indexableObject?.uuid,
						title: getVal("dc.title") || item._embedded?.indexableObject?.name,
						authors: getValList("dc.contributor.author"),
						year: getVal("dc.date.issued")?.substring(0, 4),
						publisher: getVal("dc.publisher"),
						source: "dspace",
						description: getVal("dc.description") || getVal("dc.description.abstract"),
						abstract: getVal("dc.description.abstract"),
						external_id:
							item._embedded?.indexableObject?.handle ||
							item._embedded?.indexableObject?.uuid,
						resource_type: getVal("dc.type"),
						language: getVal("dc.language"),
						citation: getVal("dc.identifier.citation"),
						sponsors: getVal("dc.description.sponsorship"),
						series: getVal("dc.relation.ispartofseries"),
						reportNo:
							getVal("dc.identifier.other") || getVal("dc.identifier.govdoc"),
						isbn: getVal("dc.identifier.isbn"),
						issn: getVal("dc.identifier.issn"),
						subjects: getValList("dc.subject"),
						format: getVal("dc.format"),

						// enrich
						collection: owningCollection.name,
						community: parentCommunity.name,
					};
				}),
			);


			setAllResources(mappedResults);
			setCurrentPage(1);
		} catch (error) {
			console.error("Error fetching resources:", error);
			setAllResources([]);
		} finally {
			setLoading(false);
		}
	}, []);

	// Fetch items from Koha (Cataloged)
	const fetchCatalogedResources = useCallback(async (query = "") => {
		setLoading(true);
		try {
			const response = await axios.get("/api/resources/search/", {
				params: {
					q: query,
					source: "koha",
					limit: 100,
				},
			});

			if (response.data?.results) {
				// Map the results to our consistent format
				const mapped = response.data.results.map((item) => ({
					...item,
					source: item.source || "koha",
					source_name: item.source_name || "Koha Catalog",
				}));
				setCatalogedResources(mapped);
			}
		} catch (error) {
			console.error("Error fetching cataloged resources:", error);
			setCatalogedResources([]);
		} finally {
			setLoading(false);
		}
	}, []);

	const fetchSystemStats = useCallback(async () => {
		try {
			setStats({
				totalResources: 12457,
				monthlyDownloads: 5678,
				activeUsers: 890,
				communities: 12,
			});
		} catch (error) {
			console.error("Error fetching stats:", error);
		}
	}, []);

	const handleSearch = (e) => {
		e.preventDefault();
		// Search is handled by useEffect now
	};

	const fetchCollections = useCallback(async () => {
		try {
			const collectionList = await dspaceService.getCollections();
			setCollections(collectionList || []);
		} catch (error) {
			console.error("Error fetching collections:", error);
		}
	}, []);

	const handleCatalogSubmit = async () => {
		try {
			// Use Django token for backend requests
			const activeToken = djangoToken || localStorage.getItem("djangoToken");

			const config = activeToken
				? {
					headers: {
						Authorization: `Token ${activeToken}`,
					},
				}
				: {};

			const response = await axios.post(
				"/api/resources/catalog-external/",
				catalogData,
				config,
			);
			alert("Successfully cataloged in Koha!");
			setShowCatalogModal(false);
			// Reset catalog data
			setCatalogData({
				title: "",
				authors: "",
				description: "",
				year: "",
				subject_keywords: "",
				publisher: "",
				language: "en",
				resource_type: "Text",
				abstract: "",
				sponsors: "",
				dspace_url: "",
				collection: "",
				current_library: "",
				shelving_location: "",
				barcode: "",
				koha_item_type: "",
				public_note: "",
			});
		} catch (error) {
			console.error("Catalog error:", error);
			alert(
				`Failed to catalog in Koha: ${error.response?.data?.error || error.message
				}`,
			);
		}
	};

	const handleCatalogDataChange = (field, value) => {
		setCatalogData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleCatalogClick = (resource) => {
		// Construct handle URL if external_id exists
		const handleUrl = resource.external_id
			? `${import.meta.env.VITE_DSPACE_FRONTEND_URL}/handle/${resource.external_id}`
			: resource.url || "";

		setCatalogData({
			title: resource.title || "",
			authors: resource.authors || "",
			dspace_url: handleUrl,
			resource_type: resource.resource_type || "eBook",
			year: resource.year || "",
			publisher: resource.publisher || "",
			isbn_issn: resource.isbn || resource.issn || "",
			language: resource.language || "English",
			subject_keywords: resource.subjects || "",
			description: resource.description || "",
			call_number: "",
			access_note: "Open access",
			content_type: "Text",
			format: resource.format || "PDF",
			current_library: "",
			barcode: "",
			// MARC Fields
			marc_fields: {
				"000": "",
				"001": "",
				"003": "",
				"005": "",
				"006": "",
				"007": "",
				"008": "",
				"010a": "",
				"015a": "",
				"016a": "",
				"020a": "",
				"022a": "",
				"024a": "",
				"027a": "",
				"028a": "",
				"035a": "",
				"037a": "",
				"040a": "",
				"041a": "",
				"045a": "",
				"047a": "",
				"048a": "",
				"050a": "",
				"074a": "",
				"082a": "",
				"086a": "",
			},
		});
		setShowCatalogModal(true);
	};

	const handleCollectionClick = (collection) => {
		setSelectedCollections((prev) => {
			const collectionId = collection.uuid || collection.id;
			const isAlreadySelected = prev.some(
				(c) => (c.uuid || c.id) === collectionId,
			);

			if (isAlreadySelected) {
				// Remove from selection
				const newSelection = prev.filter(
					(c) => (c.uuid || c.id) !== collectionId,
				);
				if (newSelection.length === 0) {
					// If no collections selected, fetch all items
					fetchAllResources(searchQuery);
				} else {
					// Fetch items for remaining collections
					fetchDspaceItemsByCollections(newSelection);
				}
				return newSelection;
			} else {
				// Add to selection and fetch items
				const newSelection = [...prev, collection];
				fetchDspaceItemsByCollections(newSelection);
				return newSelection;
			}
		});

		// When a collection is selected, switch to digital mode
		setDisplayMode("digital");
		setCurrentPage(1);
		setActiveFilters({});
	};

	// Fetch items from specific DSpace collections
	const fetchDspaceItemsByCollections = useCallback(
		async (collections) => {
			if (!collections || collections.length === 0) {
				return;
			}

			setLoading(true);
			try {
				// Fetch items from each collection and combine results
				const allItems = [];

				for (const collection of collections) {
					const collectionId = collection.uuid || collection.id;
					// Use DSpace discover API to search within a specific collection
					const params = new URLSearchParams({
						query: searchQuery || "*",
						scope: collectionId,
						page: "0",
						size: "100",
					});

					const response = await fetch(
						`/api/dspace/discover/search/objects?${params}`,
						{
							credentials: "include",
							headers: dspaceService.getCsrfHeaders({
								Accept: "application/json",
							}),
						},
					);

					if (response.ok) {
						const data = await response.json();
						const items =
							data._embedded?.searchResult?._embedded?.objects || [];

						// Transform items to common format and filter out collections
						const transformedItems = items
							.filter((item) => {
								const type = item._embedded?.indexableObject?.type;
								return type === "item"; // Only items, not collections
							})
							.map((item) => {
								const metadata =
									item._embedded?.indexableObject?.metadata || {};
								const getVal = (key) => {
									const mk = metadata[key];
									return mk && mk.length > 0 ? mk[0].value : "";
								};
								const getValList = (key) => {
									const mk = metadata[key];
									return mk ? mk.map((m) => m.value).join(", ") : "";
								};

								return {
									id: item._embedded?.indexableObject?.uuid,
									title:
										getVal("dc.title") || item._embedded?.indexableObject?.name,
									authors: getValList("dc.contributor.author"),
									year: getVal("dc.date.issued")?.substring(0, 4),
									publisher: getVal("dc.publisher"),
									source: "dspace",
									description:
										getVal("dc.description") ||
										getVal("dc.description.abstract"),
									abstract: getVal("dc.description.abstract"),
									external_id:
										item._embedded?.indexableObject?.handle ||
										item._embedded?.indexableObject?.uuid,
									resource_type: getVal("dc.type"),
									language: getVal("dc.language"),
									citation: getVal("dc.identifier.citation"),
									sponsors: getVal("dc.description.sponsorship"),
									series: getVal("dc.relation.ispartofseries"),
									reportNo:
										getVal("dc.identifier.other") ||
										getVal("dc.identifier.govdoc"),
									isbn: getVal("dc.identifier.isbn"),
									issn: getVal("dc.identifier.issn"),
									subjects: getValList("dc.subject"),
									format: getVal("dc.format"),
								};
							});

						allItems.push(...transformedItems);
					}
				}

				setAllResources(allItems);
				setCurrentPage(1);
			} catch (error) {
				console.error("Error fetching collection items:", error);
			} finally {
				setLoading(false);
			}
		},
		[searchQuery],
	);

	const clearCollectionFilter = () => {
		setSelectedCollections([]);
		fetchAllResources(searchQuery);
		setCurrentPage(1);
		setActiveFilters({});
	};

	const handleDisplayModeChange = (mode) => {
		setDisplayMode(mode);
		setCurrentPage(1);
		setActiveFilters({}); // Reset all side filters when switching modes
		if (mode === "cataloged") {
			setSelectedCollections([]);
			fetchCatalogedResources(searchQuery);
		} else {
			fetchAllResources(searchQuery);
		}
	};

	const getResourcesToDisplay = () => {
		if (displayMode === "cataloged") {
			return catalogedResources;
		}
		return allResources;
	};

	const applyTreeFilters = (resources) => {
		if (Object.keys(activeFilters).length === 0) return resources;

		return resources.filter((resource) => {
			// Check each filter category
			for (const [category, selectedValues] of Object.entries(activeFilters)) {
				if (!selectedValues || selectedValues.length === 0) continue;

				let resourceValue;
				if (category === "source") {
					resourceValue = resource.source_name || resource.source || "Unknown";
				} else if (category === "community") {
					resourceValue = resource.community || "Unknown";
				} else if (category === "collection") {
					resourceValue = resource.collection || "Unknown";
				} else if (category === "year") {
					resourceValue = resource.year;
				} else if (category === "author") {
					// Provide loose matching for authors
					const authors = (resource.authors || "").toLowerCase();
					const match = selectedValues.some((val) =>
						authors.includes(val.toLowerCase()),
					);
					if (!match) return false;
					continue; // Skip the equality check below for authors
				}

				if (resourceValue === null || resourceValue === undefined) {
					return false;
				}

				if (!selectedValues.includes(String(resourceValue))) {
					return false;
				}
			}
			return true;
		});
	};

	const baseResources = getResourcesToDisplay();
	// We compute filter options from the BASE resources (before filtering)
	// so that the tree shows all available options in the current view/mode

	const resourcesToDisplay = applyTreeFilters(baseResources);

	const handleDspacePageChange = (newPage) => {
		if (selectedCollections.length > 0) {
			fetchDspaceItemsByCollections(
				selectedCollections,
				newPage,
				dspacePagination.size,
			);
		}
	};

	useEffect(() => {
		// Initial fetch
		fetchAllResources();
		fetchSystemStats();
		fetchCollections();
	}, [fetchAllResources, fetchCollections, fetchSystemStats]);

	// Debounced search effect
	useEffect(() => {
		const delayDebounceFn = setTimeout(() => {
			if (searchQuery !== undefined) {
				if (displayMode === "cataloged") {
					fetchCatalogedResources(searchQuery);
				} else if (selectedCollections.length > 0) {
					fetchDspaceItemsByCollections(selectedCollections);
				} else {
					fetchAllResources(searchQuery);
				}
			}
		}, 500);

		return () => clearTimeout(delayDebounceFn);
	}, [
		searchQuery,
		selectedCollections,
		displayMode,
		fetchAllResources,
		fetchCatalogedResources,
		fetchDspaceItemsByCollections,
	]);

	return (
		<div className="min-h-screen bg-white">
			{/* Hero Section */}
			<section className="bg-primary py-16 text-primary-foreground">
				<div className="max-w-6xl mx-auto px-4">
					<div className="text-center mb-8">
						<h1 className="text-5xl font-bold mb-4">{ORG_NAME}</h1>
					</div>

					<form onSubmit={handleSearch} className="max-w-3xl mx-auto">
						<div className="relative">
							<Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="የነዋሪነት፣ ወሳኝ ኩነት መረጃዎች ይፈልጉ..."
								className="w-full pl-12 pr-32 py-4 text-lg bg-white text-gray-800 rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none shadow-sm"
							/>
							<button
								type="submit"
								className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#1A3D64] hover:bg-[#2A4D74] text-white px-8 py-2 rounded-lg font-medium transition-colors cursor-pointer"
							>
								ፈልግ
							</button>
						</div>
					</form>
				</div>
			</section>

			{/* Latest Additions / Featured Items */}
			<section className="bg-white py-16">
				<div className="mx-auto container px-4">
					<div className="text-center mb-12" />

					<div className="flex justify-between items-center mb-6">
						<h3 className="text-2xl font-bold text-gray-900">
							Recent Records and Catalogs
							<span className="text-gray-500 text-lg ml-2">
								({resourcesToDisplay.length} results)
							</span>
						</h3>
						<div className="flex space-x-4" />
					</div>

					{/* Collection filter status - subtle version */}
					{selectedCollections.length > 0 && displayMode === "digital" && (
						<div className="mb-4 p-2 bg-blue-50 rounded-lg border border-blue-100 text-sm">
							<div className="flex items-center justify-between">
								<div className="flex items-center">
									<span className="text-blue-700 mr-2">
										Viewing items from:
									</span>
									<div className="flex flex-wrap gap-1">
										{selectedCollections.map((collection) => (
											<span
												key={collection.uuid || collection.id}
												className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs"
											>
												{collection.name}
												<button
													type="button"
													onClick={() => handleCollectionClick(collection)}
													className="ml-1 text-blue-600 hover:text-blue-800 cursor-pointer"
												>
													<X className="w-3 h-3" />
												</button>
											</span>
										))}
									</div>
								</div>
								{selectedCollections.length > 0 && (
									<button
										type="button"
										onClick={clearCollectionFilter}
										className="text-blue-600 hover:text-blue-800 text-sm cursor-pointer"
									>
										Clear all
									</button>
								)}
							</div>

							{/* DSpace pagination info */}
							{dspaceItems.length > 0 && dspacePagination.totalPages > 1 && (
								<div className="mt-2 pt-2 border-t border-blue-100">
									<div className="flex items-center justify-between">
										<span className="text-blue-600 text-xs">
											Page {dspacePagination.number + 1} of{" "}
											{dspacePagination.totalPages}(
											{dspacePagination.totalElements} total items)
										</span>
										<div className="flex space-x-2">
											{dspacePagination.number > 0 && (
												<button
													type="button"
													onClick={() =>
														handleDspacePageChange(dspacePagination.number - 1)
													}
													className="px-2 py-1 text-xs bg-white border border-blue-200 text-blue-600 rounded hover:bg-blue-50 cursor-pointer"
												>
													Previous
												</button>
											)}
											{dspacePagination.number <
												dspacePagination.totalPages - 1 && (
													<button
														type="button"
														onClick={() =>
															handleDspacePageChange(dspacePagination.number + 1)
														}
														className="px-2 py-1 text-xs bg-white border border-blue-200 text-blue-600 rounded hover:bg-blue-50 cursor-pointer"
													>
														Next
													</button>
												)}
										</div>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Display mode filters */}
					<div className="flex flex-wrap gap-4 mb-6">
						<div className="flex items-center space-x-2">
							<span className="text-sm font-medium text-gray-700">Show:</span>
							<button
								type="button"
								onClick={() => handleDisplayModeChange("digital")}
								className={`px-4 py-2 rounded-md text-sm transition-colors cursor-pointer ${displayMode === "digital"
									? "bg-blue-600 text-white"
									: "border border-gray-300 text-gray-700 hover:bg-gray-100"
									}`}
							>
								Digital
							</button>
							<button
								type="button"
								onClick={() => handleDisplayModeChange("cataloged")}
								className={`px-4 py-2 rounded-md text-sm transition-colors cursor-pointer ${displayMode === "cataloged"
									? "bg-blue-600 text-white"
									: "border border-gray-300 text-gray-700 hover:bg-gray-100"
									}`}
							>
								Cataloged
							</button>
						</div>
					</div>

					<div className="flex flex-col lg:flex-row gap-6">
						{/* Left Sidebar - Metadata Tree Filter */}
						<div className="lg:w-1/4">
							<MetadataTreeFilter
								resources={baseResources}
								selectedFilters={activeFilters}
								onFilterChange={setActiveFilters}
								onClearFilters={() => setActiveFilters({})}
								className="sticky top-4"
							/>
						</div>

						{/* Right Content - Resource Table */}
						<div className="lg:w-3/4">
							<ResourceTable
								resources={resourcesToDisplay.slice(
									(currentPage - 1) * pageSize,
									currentPage * pageSize,
								)}
								loading={loading}
								onCatalogClick={handleCatalogClick}
							/>

							{/* Pagination Controls */}
							{resourcesToDisplay.length > pageSize && (
								<div className="mt-4 flex items-center justify-between bg-white px-4 py-3 border-t border-gray-200 sm:px-6 rounded-lg border">
									<div className="flex-1 flex justify-between sm:hidden">
										<button
											type="button"
											onClick={() => {
												setCurrentPage(Math.max(1, currentPage - 1));
												window.scrollTo({
													top: document.querySelector("#resource-section")
														? document.querySelector("#resource-section")
															.offsetTop - 100
														: 0,
													behavior: "smooth",
												});
											}}
											disabled={currentPage === 1}
											className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${currentPage === 1
												? "opacity-50 cursor-not-allowed"
												: "cursor-pointer"
												}`}
										>
											Previous
										</button>
										<button
											type="button"
											onClick={() => {
												setCurrentPage(
													Math.min(
														Math.ceil(resourcesToDisplay.length / pageSize),
														currentPage + 1,
													),
												);
												window.scrollTo({
													top: document.querySelector("#resource-section")
														? document.querySelector("#resource-section")
															.offsetTop - 100
														: 0,
													behavior: "smooth",
												});
											}}
											disabled={
												currentPage ===
												Math.ceil(resourcesToDisplay.length / pageSize)
											}
											className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${currentPage ===
												Math.ceil(resourcesToDisplay.length / pageSize)
												? "opacity-50 cursor-not-allowed"
												: "cursor-pointer"
												}`}
										>
											Next
										</button>
									</div>
									<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
										<div>
											<p className="text-sm text-gray-700">
												Showing{" "}
												<span className="font-medium">
													{(currentPage - 1) * pageSize + 1}
												</span>{" "}
												to{" "}
												<span className="font-medium">
													{Math.min(
														currentPage * pageSize,
														resourcesToDisplay.length,
													)}
												</span>{" "}
												of{" "}
												<span className="font-medium">
													{resourcesToDisplay.length}
												</span>{" "}
												results
											</p>
										</div>
										<div>
											<nav
												className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
												aria-label="Pagination"
											>
												<button
													type="button"
													onClick={() => {
														setCurrentPage(Math.max(1, currentPage - 1));
													}}
													disabled={currentPage === 1}
													className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 cursor-pointer ${currentPage === 1
														? "opacity-50 cursor-not-allowed"
														: "cursor-pointer"
														}`}
												>
													<span className="sr-only">Previous</span>
													<svg
														className="h-5 w-5"
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 20 20"
														fill="currentColor"
														aria-hidden="true"
													>
														<title>previous</title>
														<path
															fillRule="evenodd"
															d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
															clipRule="evenodd"
														/>
													</svg>
												</button>
												<span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
													Page {currentPage} of{" "}
													{Math.ceil(resourcesToDisplay.length / pageSize)}
												</span>
												<button
													type="button"
													onClick={() => {
														setCurrentPage(
															Math.min(
																Math.ceil(resourcesToDisplay.length / pageSize),
																currentPage + 1,
															),
														);
													}}
													disabled={
														currentPage ===
														Math.ceil(resourcesToDisplay.length / pageSize)
													}
													className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 cursor-pointer ${currentPage ===
														Math.ceil(resourcesToDisplay.length / pageSize)
														? "opacity-50 cursor-not-allowed"
														: "cursor-pointer"
														}`}
												>
													<span className="sr-only">Next</span>
													<svg
														className="h-5 w-5"
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 20 20"
														fill="currentColor"
														aria-hidden="true"
													>
														<title>next</title>
														<path
															fillRule="evenodd"
															d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
															clipRule="evenodd"
														/>
													</svg>
												</button>
											</nav>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</section>

			<HowItWorks />

			<CatalogModal
				isOpen={showCatalogModal}
				onClose={() => setShowCatalogModal(false)}
				catalogData={catalogData}
				onCatalogDataChange={handleCatalogDataChange}
				onSubmit={handleCatalogSubmit}
			/>

			{/* Stats and Additional Sections - Same as before */}
			<div className="max-w-7xl mx-auto px-4 py-12">
				{/* System Overview */}
				<section className="mb-16">
					<div className="text-center mb-12">
						<h2 className="text-4xl font-bold text-gray-900 mb-4">
							ብሔራዊ መዛግብት እና መጻሕፍት መድረክ
						</h2>
						<p className="text-xl text-gray-600 max-w-4xl mx-auto">
							የኢትዮጵያ ማዕከላዊ የመዛግብት እና መጻሕፍት መድረክ። ከ2016 ጀምሮ በማስረጃ ላይ የተመሰረተ የምርምር
							እና የህዝብ ብዛት ድግፍ።
						</p>
					</div>

					{/* Stats Overview */}
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
						<Card className="text-center bg-white hover:shadow-lg transition-shadow border border-gray-200">
							<BarChart3 className="w-8 h-8 text-gray-800 mx-auto mb-3" />
							<h3 className="text-4xl font-bold text-gray-900 mb-2">
								{stats.totalResources.toLocaleString()}
							</h3>
							<p className="text-gray-600 font-medium">መዛግብት እና መጻሕፍት</p>
						</Card>
						<Card className="text-center bg-white hover:shadow-lg transition-shadow border border-gray-200">
							<Download className="w-8 h-8 text-gray-800 mx-auto mb-3" />
							<h3 className="text-4xl font-bold text-gray-900 mb-2">
								{stats.monthlyDownloads.toLocaleString()}+
							</h3>
							<p className="text-gray-600 font-medium">ወርሃዊ መዳረሻ</p>
						</Card>
						<Card className="text-center bg-white hover:shadow-lg transition-shadow border border-gray-200">
							<Users className="w-8 h-8 text-gray-800 mx-auto mb-3" />
							<h3 className="text-4xl font-bold text-gray-900 mb-2">
								{stats.activeUsers.toLocaleString()}
							</h3>
							<p className="text-gray-600 font-medium">የተመዘገቡ ተጠቃሚዎች</p>
						</Card>
						<Card className="text-center bg-white hover:shadow-lg transition-shadow border border-gray-200">
							<MapPin className="w-8 h-8 text-gray-800 mx-auto mb-3" />
							<h3 className="text-4xl font-bold text-gray-900 mb-2">
								{stats.communities}
							</h3>
							<p className="text-gray-600 font-medium">ክልላዊ ቢሮዎች</p>
						</Card>
					</div>
				</section>

				{/* Guidelines for Submitters */}
				<section className="mb-16">
					<div className="bg-blue-50 rounded-2xl p-8">
						<h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
							Guidelines for Submitters
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="text-center">
								<Book className="w-12 h-12 text-blue-600 mx-auto mb-4" />
								<h3 className="text-xl font-semibold text-gray-900 mb-3">
									File Formats
								</h3>
								<p className="text-gray-600">
									Accepted formats: PDF, EPUB, DOC, DOCX, TXT. Maximum file
									size: 50MB per file.
								</p>
							</div>
							<div className="text-center">
								<CheckCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
								<h3 className="text-xl font-semibold text-gray-900 mb-3">
									Metadata Requirement
								</h3>
								<p className="text-gray-600">
									All submissions must include accurate metadata including
									author, year, and subject keywords.
								</p>
							</div>
							<div className="text-center">
								<AlertCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
								<h3 className="text-xl font-semibold text-gray-900 mb-3">
									Review Process
								</h3>
								<p className="text-gray-600">
									Submissions are reviewed by librarians within 3 business days
									before being published.
								</p>
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
};

export default Home;
