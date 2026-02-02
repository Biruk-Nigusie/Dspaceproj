import Carousel from "../components/UI/Carousel";
import dspaceService from "../services/dspaceService";
import CatalogModal from "./CatalogModal";
import { AuthContext } from "../contexts/AuthContext";
import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { AlertCircle, BarChart3, Book, CheckCircle, Download, Filter, Heart, MapPin, UserPlus, Users, Search, X } from "lucide-react";

import ResourceTable from "./ResourceTable";
import HowItWorks from "../components/HowItWorks";
import Card from "../components/UI/Card";
import MetadataTreeFilter from "../components/MetadataTreeFilter";

const Home = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [allResources, setAllResources] = useState([]); // For all resources (mixed)
    const [catalogedResources, setCatalogedResources] = useState([]); // For Koha cataloged items
    const [dspaceItems, setDspaceItems] = useState([]); // For DSpace items fetched directly
    const [dspaceHierarchy, setDspaceHierarchy] = useState([]); // For Community/Collection hierarchy
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
            "000": "", "001": "", "003": "", "005": "", "006": "", "007": "", "008": "",
            "010a": "", "015a": "", "016a": "", "020a": "", "022a": "", "024a": "",
            "027a": "", "028a": "", "035a": "", "037a": "", "040a": "", "041a": "",
            "045a": "", "047a": "", "048a": "", "050a": "", "074a": "", "082a": "", "086a": ""
        }
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
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const [dspacePagination, setDspacePagination] = useState({
        page: 0,
        size: 10,
        totalPages: 0,
        totalElements: 0,
    });

    const { user, token, djangoToken } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    // Sync search and collections from URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const q = params.get('q');
        const colIdsRaw = params.get('collections');

        if (q) setSearchQuery(q);

        if (colIdsRaw) {
            const colIds = colIdsRaw.split(',').filter(id => id);
            const found = collections.filter(c => colIds.includes(c.uuid || c.id));
            if (found.length > 0) {
                setSelectedCollections(found);
                setDisplayMode("digital");
            } else {
                setSelectedCollections([]);
            }
        } else {
            setSelectedCollections([]);
        }
    }, [location.search, collections]);

    useEffect(() => {
        // Initial fetch
        fetchAllResources();
        fetchSystemStats();
        fetchCollections();
        fetchDspaceHierarchy();
    }, [user]);

    const fetchDspaceHierarchy = async () => {
        try {
            const hierarchy = await dspaceService.getHierarchy();
            setDspaceHierarchy(hierarchy);
        } catch (error) {
            console.error("Error fetching hierarchy:", error);
        }
    };

    // Debounced search effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery !== undefined) {
                if (selectedCollections.length > 0) {
                    fetchDspaceItemsByCollections(selectedCollections);
                } else {
                    fetchAllResources(searchQuery);
                }
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, selectedCollections]);

    // Fetch all resources (Mixed DSpace & Koha)
    const fetchAllResources = async (query = "") => {
        setLoading(true);
        try {
            // 1. Fetch DSpace Items
            const dspaceResults = await dspaceService.searchItems(query);
            const mappedDspace = dspaceResults
                .filter(item => item._embedded?.indexableObject?.type === 'item')
                .map(item => {
                    const metadata = item._embedded?.indexableObject?.metadata || {};
                    const getVal = (key) => metadata[key]?.[0]?.value || "";
                    const getValList = (key) => metadata[key]?.map(m => m.value).join(", ") || "";

                    return {
                        id: item._embedded?.indexableObject?.uuid,
                        title: getVal("dc.title") || item._embedded?.indexableObject?.name,
                        authors: getValList("dc.contributor.author"),
                        year: getVal("dc.date.issued")?.substring(0, 4),
                        source: "dspace",
                        source_name: "Research Repository",
                        resource_type: getVal("dc.type") || "Digital",
                        external_id: item._embedded?.indexableObject?.handle || item._embedded?.indexableObject?.uuid,
                        description: getVal("dc.description") || getVal("dc.description.abstract"),
                        language: getVal("dc.language"),
                        format: getVal("dc.format"),
                    };
                });

            // 2. Fetch Koha Items
            let mappedKoha = [];
            try {
                const kohaResponse = await axios.get(`/api/resources/search/`, {
                    params: { q: query, source: 'koha', limit: 50 }
                });
                if (kohaResponse.data?.results) {
                    mappedKoha = kohaResponse.data.results.map(item => ({
                        ...item,
                        source: 'koha',
                        source_name: 'Library Catalog'
                    }));
                }
            } catch (err) {
                console.error("Koha fetch error:", err);
            }

            // Combine and set
            setAllResources([...mappedDspace, ...mappedKoha]);
            setCatalogedResources(mappedKoha); // Keep this for secondary filters
            setCurrentPage(1);
        } catch (error) {
            console.error("Error fetching resources:", error);
            setAllResources([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch items from Koha (Cataloged)
    const fetchCatalogedResources = async (query = "") => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/resources/search/`, {
                params: {
                    q: query,
                    source: 'koha',
                    limit: 100
                }
            });

            if (response.data && response.data.results) {
                // Map the results to our consistent format
                const mapped = response.data.results.map(item => ({
                    ...item,
                    source: item.source || 'koha',
                    source_name: item.source_name || 'Koha Catalog'
                }));
                setCatalogedResources(mapped);
            }
        } catch (error) {
            console.error("Error fetching cataloged resources:", error);
            setCatalogedResources([]);
        } finally {
            setLoading(false);
        }
    };


    const fetchSystemStats = async () => {
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
    };



    const fetchCollections = async () => {
        try {
            const collectionList = await dspaceService.getCollections();
            setCollections(collectionList || []);
        } catch (error) {
            console.error("Error fetching collections:", error);
        }
    };

    const handleCatalogSubmit = async () => {
        try {
            // Use Django token for backend requests
            const activeToken = djangoToken || localStorage.getItem('djangoToken');

            const config = activeToken ? {
                headers: {
                    Authorization: `Token ${activeToken}`
                }
            } : {};

            const response = await axios.post(
                "/api/resources/catalog-external/",
                catalogData,
                config
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
                "Failed to catalog in Koha: " +
                (error.response?.data?.error || error.message),
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
            ? `http://localhost:4000/handle/${resource.external_id}`
            : (resource.url || "");

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
                "000": "", "001": "", "003": "", "005": "", "006": "", "007": "", "008": "",
                "010a": "", "015a": "", "016a": "", "020a": "", "022a": "", "024a": "",
                "027a": "", "028a": "", "035a": "", "037a": "", "040a": "", "041a": "",
                "045a": "", "047a": "", "048a": "", "050a": "", "074a": "", "082a": "", "086a": ""
            }
        });
        setShowCatalogModal(true);
    };

    const handleCollectionClick = (collection) => {
        const id = collection.uuid || collection.id;
        const currentParams = new URLSearchParams(location.search);
        let selected = currentParams.get('collections')?.split(',').filter(x => x) || [];

        if (selected.includes(id)) {
            selected = selected.filter(c => c !== id);
        } else {
            selected.push(id);
        }

        if (selected.length > 0) {
            currentParams.set('collections', selected.join(','));
        } else {
            currentParams.delete('collections');
        }

        navigate(`/?${currentParams.toString()}`);
    };



    // Fetch items from specific DSpace collections
    const fetchDspaceItemsByCollections = async (collections) => {
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
                        headers: dspaceService.getCsrfHeaders({ Accept: "application/json" }),
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    const items = data._embedded?.searchResult?._embedded?.objects || [];

                    // Transform items to common format and filter out collections
                    const transformedItems = items
                        .filter(item => {
                            const type = item._embedded?.indexableObject?.type;
                            return type === 'item'; // Only items, not collections
                        })
                        .map(item => {
                            const metadata = item._embedded?.indexableObject?.metadata || {};
                            const getVal = (key) => {
                                const mk = metadata[key];
                                return mk && mk.length > 0 ? mk[0].value : "";
                            };
                            const getValList = (key) => {
                                const mk = metadata[key];
                                return mk ? mk.map(m => m.value).join(", ") : "";
                            };

                            return {
                                id: item._embedded?.indexableObject?.uuid,
                                title: getVal("dc.title") || item._embedded?.indexableObject?.name,
                                authors: getValList("dc.contributor.author"),
                                year: getVal("dc.date.issued")?.substring(0, 4),
                                publisher: getVal("dc.publisher"),
                                source: "dspace",
                                description: getVal("dc.description") || getVal("dc.description.abstract"),
                                abstract: getVal("dc.description.abstract"),
                                external_id: item._embedded?.indexableObject?.handle || item._embedded?.indexableObject?.uuid,
                                resource_type: getVal("dc.type"),
                                language: getVal("dc.language"),
                                citation: getVal("dc.identifier.citation"),
                                sponsors: getVal("dc.description.sponsorship"),
                                series: getVal("dc.relation.ispartofseries"),
                                reportNo: getVal("dc.identifier.other") || getVal("dc.identifier.govdoc"),
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
    };

    const clearCollectionFilter = () => {
        setSelectedCollections([]);
        fetchAllResources(searchQuery);
        setCurrentPage(1);
        setActiveFilters({});
        navigate("/"); // Clear collection filter from URL
    };

    const getResourcesToDisplay = () => {
        return allResources;
    };

    const applyTreeFilters = (resources) => {
        if (Object.keys(activeFilters).length === 0) return resources;

        return resources.filter(resource => {
            // Check each filter category
            for (const [category, selectedValues] of Object.entries(activeFilters)) {
                if (!selectedValues || selectedValues.length === 0) continue;

                let resourceValue;
                if (category === 'source') {
                    resourceValue = resource.source_name || resource.source || 'Unknown';
                } else if (category === 'type') {
                    resourceValue = resource.resource_type || 'Unknown';
                } else if (category === 'year') {
                    resourceValue = resource.year;
                } else if (category === 'language') {
                    const lang = resource.language === 'en' ? 'English' :
                        resource.language === 'am' ? 'Amharic' : resource.language;
                    resourceValue = lang;
                } else if (category === 'author') {
                    // Provide loose matching for authors
                    const authors = (resource.authors || "").toLowerCase();
                    const match = selectedValues.some(val => authors.includes(val.toLowerCase()));
                    if (!match) return false;
                    continue; // Skip the equality check below for authors
                } else if (category === 'publisher') {
                    resourceValue = resource.publisher || 'Unknown';
                }

            }
            return true;
        });
    };

    const getSubCommunitiesToDisplay = () => {
        if (!dspaceHierarchy || dspaceHierarchy.length === 0) return [];

        // If nothing selected, show the first level of sub-communities (children of top-level nodes)
        if (selectedCollections.length === 0) {
            const subs = dspaceHierarchy.flatMap(node => node.children || []);
            // Show only the first 4 main sub-communities (Archive, Multimedia, Printed Material, Serial)
            return subs.length > 0 ? subs.slice(0, 4) : dspaceHierarchy.slice(0, 4);
        }

        const lastSelected = selectedCollections[selectedCollections.length - 1];
        const findNodeDeep = (nodes) => {
            for (const node of nodes) {
                if ((node.uuid || node.id) === (lastSelected.uuid || lastSelected.id)) {
                    return node.children && node.children.length > 0 ? node.children : nodes;
                }
                if (node.children) {
                    const found = findNodeDeep(node.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return findNodeDeep(dspaceHierarchy) || dspaceHierarchy;
    };

    const baseResources = getResourcesToDisplay();
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

    return (
        <div className="min-h-screen bg-white">


            {/* Hero Section */}
            <div className="relative">
                <Carousel />

                {/* Stats Ribbon - Positioned lower to avoid card overlap */}
                <div className="absolute bottom-20 left-0 w-full bg-blue-900/90 backdrop-blur-md py-6 mt-10 z-30">
    <div className="max-w-7xl mx-auto px-12 top-10 text-[12px]">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-2">
            <div className="text-center border-r border-white/10 last:border-0">
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-1">
                    25,091
                </h3>
                <p className="text-blue-200 text-[10px] md:text-xs font-bold uppercase tracking-widest">Total</p>
                <p className="text-blue-300/70 text-[20px] md:text-[20px] mt-1">Verified collection</p>
            </div>
            <div className="text-center border-r border-white/10 last:border-0">
                <h3 className="text-2xl md:text-20xl lg:text-4xl font-black text-white mb-1">
                    24,710
                </h3>
                <p className="text-blue-200 text-[10px] md:text-xs font-bold uppercase tracking-widest">Archive</p>
                <p className="text-blue-300/70 text-[20px] md:text-[20px] mt-1">Historical manuscripts</p>
            </div>
            <div className="text-center border-r border-white/10 last:border-0">
                <h3 className="text-2xl md:text-2xl lg:text-4xl font-black text-white mb-1">
                    274
                </h3>
                <p className="text-blue-200 text-[10px] md:text-xs font-bold uppercase tracking-widest">Serial</p>
                <p className="text-blue-300/70 text-[20px] md:text-[20px] mt-1">Periodical records</p>
            </div>
            <div className="text-center border-r border-white/10 last:border-0">
                <h3 className="text-2xl md:text-2xl lg:text-4xl font-black text-white mb-1">
                    68
                </h3>
                <p className="text-blue-200 text-[10px] md:text-xs font-bold uppercase tracking-widest">Printed Material</p>
                <p className="text-blue-300/70 text-[20px] md:text-[20px] mt-1">Published volumes</p>
            </div>
            <div className="text-center last:border-0">
                <h3 className="text-2xl md:text-2xl lg:text-4xl font-black text-white mb-1">
                    39
                </h3>
                <p className="text-blue-200 text-[10px] md:text-xs font-bold uppercase tracking-widest">Multimedia</p>
                <p className="text-blue-300/70 text-[20px] md:text-[20px] mt-1">Digital media assets</p>
            </div>
        </div>
    </div>
</div>

                {/* Search Bar positioned below the stats ribbon */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-full max-w-4xl px-4 py-4z-40">
                    <div className="bg-white rounded-sm shadow-sm flex items-center border border-gray-200">
                        <div className="relative flex-1 flex items-center">
                            <Search className="absolute left-5 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search through archives, books, manuscripts and more..."
                                className="w-full h-12 md:h-14 pl-14 pr-6 text-base rounded-l-sm focus:outline-none placeholder:text-gray-400 font-medium"
                            />
                        </div>
                        <button
                            onClick={() => fetchAllResources(searchQuery)}
                            className="bg-blue-900 text-white h-12 md:h-14 px-8 rounded-r-sm font-bold hover:bg-blue-800 transition-all active:scale-95 cursor-pointer uppercase tracking-wider text-xs"
                        >
                            Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Spacer to account for the overlapping search bar at the bottom */}
            <div className="h-20"></div>





            {/* Latest Additions / Featured Items */}
            <section className="bg-white py-16">
                <div className="max-w-[95%] px-4">
                    <div className="text-center mb-1">


                    </div>



                    {/* Collection filter status - subtle version */}
                    {selectedCollections.length > 0 && (
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
                                                    onClick={() => handleCollectionClick(collection)}
                                                    className="ml-1 text-blue-900 hover:text-blue-800 cursor-pointer"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {selectedCollections.length > 0 && (
                                    <button
                                        onClick={clearCollectionFilter}
                                        className="text-blue-900 hover:text-blue-800 text-sm cursor-pointer"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>

                            {/* DSpace pagination info */}
                            {dspaceItems.length > 0 && dspacePagination.totalPages > 1 && (
                                <div className="mt-2 pt-2 border-t border-blue-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-blue-900 text-xs">
                                            Page {dspacePagination.number + 1} of{" "}
                                            {dspacePagination.totalPages}(
                                            {dspacePagination.totalElements} total items)
                                        </span>
                                        <div className="flex space-x-2">
                                            {dspacePagination.number > 0 && (
                                                <button
                                                    onClick={() =>
                                                        handleDspacePageChange(dspacePagination.number - 1)
                                                    }
                                                    className="px-2 py-1 text-xs bg-white border border-blue-200 text-blue-900 rounded hover:bg-blue-50 cursor-pointer"
                                                >
                                                    Previous
                                                </button>
                                            )}
                                            {dspacePagination.number <
                                                dspacePagination.totalPages - 1 && (
                                                    <button
                                                        onClick={() =>
                                                            handleDspacePageChange(dspacePagination.number + 1)
                                                        }
                                                        className="px-2 py-1 text-xs bg-white border border-blue-200 text-blue-900 rounded hover:bg-blue-50 cursor-pointer"
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

                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Left Sidebar - Metadata Tree Filter */}
                        <div className="lg:w-1/4">
                            <MetadataTreeFilter
                                resources={baseResources}
                                dspaceHierarchy={dspaceHierarchy}
                                selectedFilters={activeFilters}
                                onFilterChange={setActiveFilters}
                                onClearFilters={() => setActiveFilters({})}
                                onCollectionClick={handleCollectionClick}
                                className="sticky top-4"
                            />
                        </div>

                        {/* Right Content - Resource Table */}
                        <div className="lg:w-3/4">
                            {/* Sub-community selection buttons */}
                            {/* Sub-community selection buttons */}
                            {dspaceHierarchy.length > 0 && (
                                <div className="bg-white border-b border-gray-100 p-6 mb-8 rounded-sm shadow-sm">
                                    <div className="flex flex-wrap items-center gap-3">
                                        {getSubCommunitiesToDisplay().map((node) => {
                                            const isSelected = selectedCollections.some(c => (c.uuid || c.id) === (node.uuid || node.id));
                                            return (
                                                <button
                                                    key={node.id || node.uuid}
                                                    onClick={() => handleCollectionClick(node)}
                                                    className={`px-6 py-2.5 rounded-sm border border-blue-900/10 transition-all cursor-pointer active:bg-blue-900/10 flex items-center space-x-4 text-[11px] font-bold uppercase tracking-[0.1em]
                                                        ${isSelected
                                                            ? 'bg-blue-900 text-white'
                                                            : 'bg-white text-blue-900'
                                                        }`}
                                                >
                                                    <span className="truncate max-w-[250px]">{node.name}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black transition-colors ${isSelected ? 'text-white' : 'bg-blue-50 text-blue-900/40'}`}>
                                                        {node.count || 0}
                                                    </span>
                                                </button>
                                            );
                                        })}

                                        {/* Inline Pagination (Unified Style) */}
                                        {resourcesToDisplay.length > pageSize && (
                                            <div className="ml-auto flex items-center">
                                                <nav className="relative z-0 inline-flex rounded-sm -space-x-px" aria-label="Pagination">
                                                    <button
                                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                                        disabled={currentPage === 1}
                                                        className={`relative inline-flex items-center px-4 py-2.5 rounded-l-sm border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 cursor-pointer ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                    >
                                                        <span className="sr-only">Previous</span>
                                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                    <span className="relative inline-flex items-center px-6 py-2.5 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                                        Page {currentPage} of {Math.ceil(resourcesToDisplay.length / pageSize)}
                                                    </span>
                                                    <button
                                                        onClick={() => setCurrentPage(Math.min(Math.ceil(resourcesToDisplay.length / pageSize), currentPage + 1))}
                                                        disabled={currentPage === Math.ceil(resourcesToDisplay.length / pageSize)}
                                                        className={`relative inline-flex items-center px-4 py-2.5 rounded-r-sm border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 cursor-pointer ${currentPage === Math.ceil(resourcesToDisplay.length / pageSize) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                    >
                                                        <span className="sr-only">Next</span>
                                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </nav>
                                            </div>
                                        )}

                                        {selectedCollections.length > 0 && (
                                            <button
                                                onClick={clearCollectionFilter}
                                                className="flex items-center text-[10px] font-bold text-blue-600 shadow-sm uppercase tracking-widest cursor-pointer transition-all group px-4 py-2 border border-blue-100 rounded-sm hover:bg-blue-50"
                                            >
                                                <span className="mr-2 transform transition-transform">←</span>
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <ResourceTable
                                resources={resourcesToDisplay.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
                                loading={loading}
                                onCatalogClick={handleCatalogClick}
                            />

                            {/* Pagination Controls */}
                            {resourcesToDisplay.length > pageSize && (
                                <div className="mt-4 flex items-center justify-between bg-white px-4 py-3 border-t border-gray-200 sm:px-6 rounded-lg border">
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        <button
                                            onClick={() => {
                                                setCurrentPage(Math.max(1, currentPage - 1));
                                                window.scrollTo({ top: document.querySelector('#resource-section') ? document.querySelector('#resource-section').offsetTop - 100 : 0, behavior: 'smooth' });
                                            }}
                                            disabled={currentPage === 1}
                                            className={`relative inline - flex items - center px - 4 py - 2 border border - gray - 300 text - sm font - medium rounded - md text - gray - 700 bg - white hover: bg - gray - 50 cursor - pointer ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} `}
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => {
                                                setCurrentPage(Math.min(Math.ceil(resourcesToDisplay.length / pageSize), currentPage + 1));
                                                window.scrollTo({ top: document.querySelector('#resource-section') ? document.querySelector('#resource-section').offsetTop - 100 : 0, behavior: 'smooth' });
                                            }}
                                            disabled={currentPage === Math.ceil(resourcesToDisplay.length / pageSize)}
                                            className={`ml - 3 relative inline - flex items - center px - 4 py - 2 border border - gray - 300 text - sm font - medium rounded - md text - gray - 700 bg - white hover: bg - gray - 50 cursor - pointer ${currentPage === Math.ceil(resourcesToDisplay.length / pageSize) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} `}
                                        >
                                            Next
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, resourcesToDisplay.length)}</span> of{' '}
                                                <span className="font-medium">{resourcesToDisplay.length}</span> results
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-sm -space-x-px" aria-label="Pagination">
                                                <button
                                                    onClick={() => {
                                                        setCurrentPage(Math.max(1, currentPage - 1));
                                                    }}
                                                    disabled={currentPage === 1}
                                                    className={`relative inline-flex items-center px-4 py-2.5 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 cursor-pointer ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} `}
                                                >
                                                    <span className="sr-only">Previous</span>
                                                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                <span className="relative inline-flex items-center px-6 py-2.5 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                                    Page {currentPage} of {Math.ceil(resourcesToDisplay.length / pageSize)}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setCurrentPage(Math.min(Math.ceil(resourcesToDisplay.length / pageSize), currentPage + 1));
                                                    }}
                                                    disabled={currentPage === Math.ceil(resourcesToDisplay.length / pageSize)}
                                                    className={`relative inline-flex items-center px-4 py-2.5 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 cursor-pointer ${currentPage === Math.ceil(resourcesToDisplay.length / pageSize) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} `}
                                                >
                                                    <span className="sr-only">Next</span>
                                                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
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


            {/* Guidelines for Submitters */}
            <section className="mb-16">
                <div className="bg-blue-50 rounded-2xl p-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                        Guidelines for Submitters
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                            <Book className="w-12 h-12 text-blue-900 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                File Formats
                            </h3>
                            <p className="text-gray-600">
                                Accepted formats: PDF, EPUB, DOC, DOCX, TXT. Maximum file
                                size: 50MB per file.
                            </p>
                        </div>
                        <div className="text-center">
                            <CheckCircle className="w-12 h-12 text-blue-900 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                Metadata Requirement
                            </h3>
                            <p className="text-gray-600">
                                All submissions must include accurate metadata including author,
                                year, and subject keywords.
                            </p>
                        </div>
                        <div className="text-center">
                            <AlertCircle className="w-12 h-12 text-blue-900 mx-auto mb-4" />
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
    );
};

export default Home;
