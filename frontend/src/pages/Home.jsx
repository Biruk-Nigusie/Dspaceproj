import axios from "axios";
import { AlertCircle, Book, CheckCircle, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import MetadataTreeFilter from "../components/MetadataTreeFilter";
import Card from "../components/UI/Card";
import dspaceService from "../services/dspaceService";
import { ORG_NAME } from "../utils/constants";
import CatalogModal from "./CatalogModal";
import ResourceTable from "./ResourceTable";

const Home = () => {
	const [allResources, setAllResources] = useState([]); // For all resources (mixed)
	const [catalogedResources] = useState([]); // For Koha cataloged items
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

	const [selectedCollections, setSelectedCollections] = useState([]);
	const [activeFilters, setActiveFilters] = useState({});
	const [displayMode, setDisplayMode] = useState("digital"); // "digital", "cataloged"

	const [columnFilters, setColumnFilters] = useState({
		houseType: { value: "", operator: "equals" },
		houseNumber: { value: "", operator: "contains" },
		husband: { value: "", operator: "contains" },
		wife: { value: "", operator: "contains" },
	});

	// Fetch all resources (using DSpace search)
	const fetchAllResources = useCallback(async () => {
		setLoading(true);
		try {
			// Use DSpace service to search
			const results = await dspaceService.searchItems(columnFilters, 100);

			// Transform DSpace items to common resource format
			// Filter out collections - only include actual items
			const mappedResults = await Promise.all(
				results.map(async (item) => {
					const owningCollectionLink =
						item._embedded?.indexableObject?._links.owningCollection?.href.split(
							"/server/api",
						)[1];

					const owningCollection =
						await dspaceService.getOwningCollection(owningCollectionLink);

					const parentCommunityLink =
						owningCollection?._links.parentCommunity?.href.split(
							"/server/api",
						)[1];

					const parentCommunity =
						await dspaceService.getParentCommunity(parentCommunityLink);

					const metadata = item._embedded?.indexableObject?.metadata || {};

					const getVal = (key) => metadata[key]?.[0]?.value || "";
					const getValList = (key) =>
						metadata[key]?.map((m) => m.value).join(", ") || "";

					return {
						id: item._embedded?.indexableObject?.uuid,
						houseFamilyKey:
							getVal("crvs.identifier.houseFamilyKey") ||
							item._embedded?.indexableObject?.name,
						husband: getValList("crvs.head.husband"),
						wife: getValList("crvs.head.wife"),
						houseNumber: getVal("crvs.identifier.houseNumber"),
						houseType: getVal("crvs.identifier.houseType"),
						dateOfRegistration: getVal("crvs.date.registration"),
						source: "dspace",
						familySummary: getVal("crvs.description.summary"),
						external_id:
							item._embedded?.indexableObject?.handle ||
							item._embedded?.indexableObject?.uuid,
						isbn: getVal("dc.identifier.isbn"),
						issn: getVal("dc.identifier.issn"),

						// enrich
						collection: owningCollection.name,
						community: parentCommunity.name,
					};
				}),
			);

			setAllResources(mappedResults);
		} catch (error) {
			console.error("Error fetching resources:", error);
			setAllResources([]);
		} finally {
			setLoading(false);
		}
	}, [columnFilters]);

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

			await axios.post("/api/resources/catalog-external/", catalogData, config);
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
				`Failed to catalog in Koha: ${
					error.response?.data?.error || error.message
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

	const clearCollectionFilter = () => {
		setSelectedCollections([]);
		fetchAllResources();
		setActiveFilters({});
	};

	const handleDisplayModeChange = (mode) => {
		setDisplayMode(mode);
		setActiveFilters({}); // Reset all side filters when switching modes
		if (mode === "cataloged") {
			setSelectedCollections([]);
			// fetchCatalogedResources(searchQuery); // Deleted
		} else {
			fetchAllResources();
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

	useEffect(() => {
		// Initial fetch
		fetchAllResources();
	}, [fetchAllResources]);

	return (
		<div className="min-h-screen bg-white">
			{/* Hero Section */}
			<section className="bg-primary py-16 text-primary-foreground">
				<div className="max-w-6xl mx-auto px-4">
					<div className="text-center">
						<h1 className="text-5xl font-bold">{ORG_NAME}</h1>
					</div>
				</div>
			</section>

			{/* Latest Additions / Featured Items */}
			<section className="bg-white py-16">
				<div className="w-full px-4 lg:px-8">
					<div className="text-center mb-12" />

					<div className="flex justify-between items-center mb-6">
						<h3 className="text-2xl font-bold text-gray-900">
							Search Results
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
						</div>
					)}

					{/* Display mode filters */}
					<div className="flex flex-wrap gap-4 mb-6">
						<div className="flex items-center space-x-2">
							<span className="text-sm font-medium text-gray-700">Show:</span>
							<button
								type="button"
								onClick={() => handleDisplayModeChange("digital")}
								className={`px-4 py-2 rounded-md text-sm transition-colors cursor-pointer ${
									displayMode === "digital"
										? "bg-blue-600 text-white"
										: "border border-gray-300 text-gray-700 hover:bg-gray-100"
								}`}
							>
								Digital
							</button>
							<button
								type="button"
								onClick={() => handleDisplayModeChange("cataloged")}
								className={`px-4 py-2 rounded-md text-sm transition-colors cursor-pointer ${
									displayMode === "cataloged"
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
								resources={resourcesToDisplay}
								loading={loading}
								onCatalogClick={handleCatalogClick}
								columnFilters={columnFilters}
								onColumnFilterChange={setColumnFilters}
							/>
						</div>
					</div>
				</div>
			</section>

			<CatalogModal
				isOpen={showCatalogModal}
				onClose={() => setShowCatalogModal(false)}
				catalogData={catalogData}
				onCatalogDataChange={handleCatalogDataChange}
				onSubmit={handleCatalogSubmit}
			/>

			{/* Stats and Additional Sections - Same as before */}
			<section className="container mx-auto px-4 py-12">
				<div className="text-center mb-12">
					<h2 className="text-4xl font-bold text-gray-900 mb-4">
						{`${ORG_NAME} ቁጥራዊ መረጃዎች`}
					</h2>
				</div>

				<Card>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center">
						<div className="text-center flex flex-col items-center gap-2">
							<h3 className="font-bold text-4xl">
								<span>3.2M</span>
							</h3>
							<h4>Registered Residents </h4>
						</div>
						<div className="text-center flex flex-col items-center gap-2">
							<h3 className="font-bold text-4xl">
								<span>2.7M</span>
							</h3>
							<h4>Digital ID</h4>
						</div>
						<div className="text-center flex flex-col items-center gap-2">
							<h3 className="font-bold text-4xl">
								<span>347.1K</span>
							</h3>
							<h4>Married </h4>
						</div>
						<div className="text-center flex flex-col items-center gap-2">
							<h3 className="font-bold text-4xl">
								<span>377.6K</span>
							</h3>
							<h4>Non Marital</h4>
						</div>
						<div className="text-center flex flex-col items-center gap-2">
							<h3 className="font-bold text-4xl">
								<span>1.3M</span>
							</h3>
							<h4>Birth Certificates </h4>
						</div>
						<div className="text-center flex flex-col items-center gap-2">
							<h3 className="font-bold text-4xl">
								<span>84.6K</span>
							</h3>
							<h4>Death</h4>
						</div>
						<div className="text-center flex flex-col items-center gap-2">
							<h3 className="font-bold text-4xl">
								<span>24.9K</span>
							</h3>
							<h4>Divorce </h4>
						</div>
						<div className="text-center flex flex-col items-center gap-2">
							<h3 className="font-bold text-4xl">
								<span>2.1K</span>
							</h3>
							<h4>Adoption</h4>
						</div>
					</div>
				</Card>
			</section>

			<div className="max-w-7xl mx-auto px-4 py-12">
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
