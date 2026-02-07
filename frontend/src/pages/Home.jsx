import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useContext, useMemo, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, X, Book, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import dspaceService from "../services/dspaceService";
import { AuthContext } from "../contexts/AuthContext";

import Carousel from "../components/UI/Carousel";
import CatalogModal from "./CatalogModal";
import ResourceTable from "./ResourceTable";
import HowItWorks from "../components/HowItWorks";
import MetadataTreeFilter from "../components/MetadataTreeFilter";
import { mapDspaceItem, applyTreeFilters } from "../utils/resourceUtils";

const Home = () => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCollections, setSelectedCollections] = useState([]);
    const [activeFilters, setActiveFilters] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const filters = {};
        ['year', 'language', 'source'].forEach(key => {
            const val = params.get(key);
            if (val) filters[key] = val.split(',');
        });
        return filters;
    });
    const [sortConfig, setSortConfig] = useState({ field: 'title', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const { user, djangoToken } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const [showCatalogModal, setShowCatalogModal] = useState(false);
    const [catalogData, setCatalogData] = useState({
        title: "", authors: "", dspace_url: "", resource_type: "eBook", year: "", publisher: "",
        isbn_issn: "", language: "English", subject_keywords: "", description: "", call_number: "",
        access_note: "Open access", content_type: "Text", format: "PDF", current_library: "",
        barcode: "", marc_fields: {}
    });

    // 1. Fetch DSpace Hierarchy with Query
    const { data: dspaceHierarchy = [] } = useQuery({
        queryKey: ['dspaceHierarchy'],
        queryFn: () => dspaceService.getHierarchy(),
        staleTime: 1000 * 60 * 30, // 30 minutes
    });

    // Flatten hierarchy for lookup and category mapping
    const { collections, categoryMap } = useMemo(() => {
        const flat = [];
        const cmap = {};

        const traverse = (nodes, currentCategory = null) => {
            nodes.forEach(node => {
                flat.push(node);
                const nodeId = node.uuid || node.id;

                let nextCategory = currentCategory;
                const lowerName = (node.name || "").toLowerCase();
                if (lowerName.includes("archive")) nextCategory = "Archive";
                else if (lowerName.includes("multimedia")) nextCategory = "Multimedia";
                else if (lowerName.includes("serial")) nextCategory = "Serial";
                else if (lowerName.includes("printed")) nextCategory = "Printed Material";

                if (nextCategory) {
                    cmap[nodeId] = nextCategory;
                }

                if (node.children) {
                    traverse(node.children, nextCategory);
                }
            });
        };

        traverse(dspaceHierarchy);
        return { collections: flat, categoryMap: cmap };
    }, [dspaceHierarchy]);


    // Fetch Catalog Map
    const { data: catalogMap = {} } = useQuery({
        queryKey: ['catalogMap'],
        queryFn: async () => {
            try {
                const res = await axios.get('/api/koha/map/');
                return res.data;
            } catch (e) {
                return {};
            }
        },
        staleTime: 1000 * 60 * 5
    });

    // 2. Main Resource Query
    const { data: allResources = [], isLoading: loading } = useQuery({
        queryKey: ['resources', searchQuery, selectedCollections.map(c => c.uuid || c.id), catalogMap],
        queryFn: async () => {
            // Determine which collection to fetch from
            let collectionsToFetch = selectedCollections;

            // If no collection selected and no search query, default to Archive collection
            if (collectionsToFetch.length === 0 && !searchQuery) {
                const archiveCollectionId = '0e2ccffa-ddb3-4fd7-868b-05a848c6de55';
                collectionsToFetch = [{ uuid: archiveCollectionId, id: archiveCollectionId, name: 'Archive' }];
            }

            const enrich = (mapped) => {
                const kohaId = catalogMap[mapped.id];
                if (kohaId) {
                    mapped.is_cataloged = true;
                    mapped.koha_id = kohaId;
                }
                return mapped;
            };

            if (collectionsToFetch.length > 0) {
                const results = [];
                for (const col of collectionsToFetch) {
                    const id = col.uuid || col.id;
                    const items = await dspaceService.searchItems(searchQuery || "*", 100, id);
                    const category = categoryMap[id] || "Archive";
                    results.push(...items
                        .filter(i => i._embedded?.indexableObject?.type === 'item')
                        .map(i => ({ ...i, collectionName: category }))
                        .map(mapDspaceItem)
                        .map(enrich)
                    );
                }
                return results;
            } else {
                const dspaceResults = await dspaceService.searchItems(searchQuery, 1000);
                const mappedDspace = dspaceResults
                    .filter(item => item._embedded?.indexableObject?.type === 'item')
                    .map(item => {
                        const itemData = item._embedded?.indexableObject;
                        const collId = itemData?._links?.owningCollection?.href?.split('/').pop();
                        const category = categoryMap[collId] || "Archive";
                        return enrich(mapDspaceItem({ ...item, collectionName: category }));
                    });

                // Only fetch Koha items if there's an active search query
                let mappedKoha = [];
                if (searchQuery && searchQuery.trim()) {
                    try {
                        const kohaResponse = await axios.get(`/api/resources/search/`, {
                            params: { q: searchQuery, source: 'koha', limit: 50 }
                        });
                        if (kohaResponse.data?.results) {
                            mappedKoha = kohaResponse.data.results.map(item => ({
                                ...item,
                                source: 'koha',
                                source_name: 'Cataloged',
                                collectionName: 'Cataloged'
                            }));
                        }
                    } catch (e) {
                        console.error("Koha error", e);
                    }
                }
                return [...mappedDspace, ...mappedKoha];
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });

    const communityType = useMemo(() => {
        let activeCategory = 'default';

        // 1. Primary: Check explicitly selected collections (Buttons or Sidebar Location)
        if (selectedCollections.length > 0) {
            const firstCol = selectedCollections[0];
            const findPath = (nodes, targetId, path = []) => {
                for (const node of nodes) {
                    if ((node.uuid || node.id) === targetId) return [...path, node];
                    if (node.children) {
                        const found = findPath(node.children, targetId, [...path, node]);
                        if (found) return found;
                    }
                }
                return null;
            };
            const path = findPath(dspaceHierarchy, firstCol.uuid || firstCol.id);
            if (path) {
                const subComm = path.find(node => ["Archive", "Multimedia", "Printed", "Serial"].some(name => node.name.includes(name)));
                if (subComm) {
                    const lowerLabel = subComm.name.toLowerCase();
                    if (lowerLabel.includes("archive")) activeCategory = "archive";
                    else if (lowerLabel.includes("multimedia")) activeCategory = "multimedia";
                    else if (lowerLabel.includes("printed")) activeCategory = "printed";
                    else if (lowerLabel.includes("serial")) activeCategory = "serial";
                }
            }
        }

        // 2. Secondary: Check active metadata filters if no collection selected
        if (activeCategory === 'default') {
            const allSelectedValues = [...(activeFilters.year || []), ...(activeFilters.language || [])];
            if (allSelectedValues.length > 0) {
                const firstVal = allSelectedValues[0];
                if (firstVal.startsWith("Archive-")) activeCategory = "archive";
                else if (firstVal.startsWith("Multimedia-")) activeCategory = "multimedia";
                else if (firstVal.startsWith("Printed Material-")) activeCategory = "printed";
                else if (firstVal.startsWith("Serial-")) activeCategory = "serial";
            }
        }

        // 3. Default to Archive on base URL with no filters or search
        if (activeCategory === 'default') {
            const hasActiveFilters = Object.keys(activeFilters).some(k => (activeFilters[k] || []).length > 0);
            const hasSearchQuery = searchQuery && searchQuery.trim();
            if (!hasActiveFilters && !hasSearchQuery) {
                activeCategory = 'archive';
            }
        }

        return activeCategory;
    }, [selectedCollections, activeFilters, dspaceHierarchy, searchQuery]);

    const { data: stats = { totalResources: 12457, monthlyDownloads: 5678, activeUsers: 890, communities: 12 } } = useQuery({
        queryKey: ['stats'],
        queryFn: async () => ({ totalResources: 12457, monthlyDownloads: 5678, activeUsers: 890, communities: 12 }),
    });

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const q = params.get('q') || "";
        const colIdsRaw = params.get('collections');

        if (q !== searchQuery) setSearchQuery(q);

        // Sync Collections
        if (colIdsRaw && collections.length > 0) {
            const colIds = colIdsRaw.split(',').filter(id => id);
            const found = collections.filter(c => colIds.includes(c.uuid || c.id));
            if (found.length > 0) {
                const currentIds = selectedCollections.map(c => (c.uuid || c.id)).sort().join(',');
                const foundIds = found.map(c => (c.uuid || c.id)).sort().join(',');
                if (currentIds !== foundIds) setSelectedCollections(found);
            }
        } else if (!colIdsRaw && selectedCollections.length > 0) {
            setSelectedCollections([]);
        }

        // Sync Filters
        const filters = {};
        ['year', 'language', 'source'].forEach(key => {
            const val = params.get(key);
            if (val) filters[key] = val.split(',');
        });
        if (JSON.stringify(filters) !== JSON.stringify(activeFilters)) {
            setActiveFilters(filters);
        }
    }, [location.search, collections]);

    const handleCatalogSubmit = async () => {
        try {
            const activeToken = djangoToken || localStorage.getItem('djangoToken');
            const config = activeToken ? { headers: { Authorization: `Token ${activeToken}` } } : {};
            await axios.post("/api/resources/catalog-external/", catalogData, config);
            toast.success("Successfully cataloged in Koha!");
            queryClient.invalidateQueries(['resources']);
            setShowCatalogModal(false);
        } catch (error) {
            toast.error("Failed to catalog: " + (error.response?.data?.error || error.message));
        }
    };

    const handleCatalogClick = (resource) => {
        const handleUrl = resource.external_id ? `http://localhost:4000/handle/${resource.external_id}` : (resource.url || "");
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
            marc_fields: {}
        });
        setShowCatalogModal(true);
    };

    const handleCollectionClick = (collection) => {
        let targetCollection = collection;

        // If clicking a community that has an "Archive" child, default to Archive
        if (collection.type === 'community' && collection.children) {
            const archiveChild = collection.children.find(child => child.name === 'Archive');
            if (archiveChild) {
                targetCollection = archiveChild;
            }
        }

        const id = targetCollection.uuid || targetCollection.id;
        const currentParams = new URLSearchParams(location.search);
        let currentSelected = currentParams.get('collections')?.split(',').filter(x => x) || [];

        if (currentSelected.includes(id)) {
            currentParams.delete('collections');
        } else {
            currentParams.set('collections', id);
        }

        // Always clear metadata filters when switching collections per user request
        currentParams.delete('year');
        currentParams.delete('language');
        setActiveFilters({});

        navigate(`/?${currentParams.toString()}`);
    };


    const getSubCommunitiesToDisplay = () => {
        const found = [];
        const targets = ["archive", "multimedia", "printed", "serial"];

        const traverse = (nodes) => {
            nodes.forEach(node => {
                const lowerName = (node.name || "").toLowerCase();
                if (targets.some(t => lowerName.includes(t))) {
                    found.push(node);
                } else if (node.children) {
                    traverse(node.children);
                }
            });
        };

        traverse(dspaceHierarchy);

        // Dedup and prioritize
        const unique = Array.from(new Map(found.map(n => [n.uuid || n.id, n])).values());
        if (unique.length > 0) {
            // Sort to maintain order: Archive, Multimedia, Printed, Serial
            return unique.sort((a, b) => {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();
                const getOrder = (n) => {
                    if (n.includes("archive")) return 1;
                    if (n.includes("multimedia")) return 2;
                    if (n.includes("printed")) return 3;
                    if (n.includes("serial")) return 4;
                    return 5;
                };
                return getOrder(nameA) - getOrder(nameB);
            });
        }

        return dspaceHierarchy.flatMap(node => node.children || []).slice(0, 4);
    };

    const filteredResources = applyTreeFilters(allResources, activeFilters);

    const resourcesToDisplay = useMemo(() => {
        let resources = filteredResources;

        // On base URL with no filters or selections, show only Archive items
        const hasActiveFilters = Object.keys(activeFilters).some(k => (activeFilters[k] || []).length > 0);
        const hasCollectionSelection = selectedCollections.length > 0;
        const hasSearchQuery = searchQuery && searchQuery.trim();

        if (!hasActiveFilters && !hasCollectionSelection && !hasSearchQuery) {
            // Filter to show only Archive sub-community items
            resources = resources.filter(r => {
                const collName = (r.collectionName || "").toLowerCase();
                return collName.includes("archive");
            });
        }

        // Apply sorting
        if (!sortConfig.field) return resources;
        return [...resources].sort((a, b) => {
            const valA = (a[sortConfig.field] || "").toString().toLowerCase();
            const valB = (b[sortConfig.field] || "").toString().toLowerCase();
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredResources, sortConfig]);

    const handleSort = (field) => {
        setSortConfig(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleSearch = () => {
        const params = new URLSearchParams(location.search);
        if (searchQuery) {
            params.set('q', searchQuery);
        } else {
            params.delete('q');
        }
        navigate(`/?${params.toString()}`);
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="relative">
                <Carousel />
                <div className="absolute bottom-20 left-0 w-full bg-blue-900/90 backdrop-blur-md py-6 mt-10 z-30">
                    <div className="max-w-7xl mx-auto px-12 text-white">
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            {[
                                { val: "25,091", label: "Total", sub: "Verified collection" },
                                { val: "24,710", label: "Archive", sub: "Historical manuscripts" },
                                { val: "274", label: "Serial", sub: "Periodical records" },
                                { val: "68", label: "Printed Material", sub: "Published volumes" },
                                { val: "39", label: "Multimedia", sub: "Digital media assets" }
                            ].map((s, i) => (
                                <div key={i} className="text-center border-r border-white/10 last:border-0">
                                    <h3 className="text-2xl font-black">{s.val}</h3>
                                    <p className="text-blue-200 text-xs font-bold uppercase">{s.label}</p>
                                    <p className="text-blue-300/70 text-sm">{s.sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-full max-w-4xl px-4 z-40">
                    <div className="bg-white rounded-sm shadow-sm flex items-center border border-gray-200">
                        <Search className="ml-5 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search through archives, books, manuscripts..."
                            className="flex-1 h-14 pl-4 pr-6 text-base focus:outline-none font-medium"
                        />
                        <button
                            onClick={handleSearch}
                            className="bg-blue-900 text-white h-14 px-8 font-bold uppercase tracking-wider text-xs cursor-pointer"
                        >
                            Search
                        </button>
                    </div>
                </div>
            </div>

            <div className="h-20"></div>

            <section className="bg-white py-16">
                <div className="max-w-[95%] mx-auto px-4">
                    {selectedCollections.length > 0 && (
                        <div className="mb-4 p-4 bg-blue-50 rounded border-none flex justify-between items-center shadow-sm">
                            <span className="text-sm font-medium">Viewing: {selectedCollections.map(c => c.name).join(", ")}</span>
                            <button onClick={() => { setSelectedCollections([]); navigate("/"); }} className="text-blue-900 text-sm font-bold cursor-pointer">Clear</button>
                        </div>
                    )}

                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="lg:w-1/4">
                            <MetadataTreeFilter
                                subCommunities={getSubCommunitiesToDisplay()}
                                resources={allResources}
                                dspaceHierarchy={dspaceHierarchy}
                                selectedFilters={activeFilters}
                                onFilterChange={(changes) => {
                                    const params = new URLSearchParams(location.search);
                                    Object.entries(changes).forEach(([cat, vals]) => {
                                        if (vals && vals.length > 0) {
                                            params.set(cat, vals.join(','));
                                        } else {
                                            params.delete(cat);
                                        }
                                    });
                                    navigate(`/?${params.toString()}`);
                                }}
                                onClearFilters={() => {
                                    navigate("/");
                                }}
                                onCollectionClick={handleCollectionClick}
                            />
                        </div>
                        <div className="lg:w-3/4">
                            <div className="bg-white p-6 mb-8 rounded shadow-sm flex flex-wrap gap-3">
                                {getSubCommunitiesToDisplay().map((node) => {
                                    const isSelected = selectedCollections.some(c => (c.uuid || c.id) === (node.uuid || node.id));
                                    return (
                                        <button
                                            key={node.id || node.uuid}
                                            onClick={() => handleCollectionClick(node)}
                                            className={`px-6 py-2.5 rounded-sm transition-all flex items-center space-x-4 text-[11px] font-bold uppercase tracking-widest cursor-pointer ${isSelected ? 'bg-blue-900 text-white shadow-md' : 'bg-white text-blue-900 hover:bg-gray-50'}`}
                                        >
                                            <span>{node.name}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] ${isSelected ? 'bg-white/20' : 'bg-blue-50'}`}>{node.count || 0}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <ResourceTable
                                resources={resourcesToDisplay.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
                                loading={loading}
                                onCatalogClick={handleCatalogClick}
                                sortConfig={sortConfig}
                                onSort={handleSort}
                                communityType={communityType}
                            />

                            {resourcesToDisplay.length > pageSize && (
                                <div className="mt-6 flex justify-between items-center bg-gray-50 p-4 rounded shadow-sm">
                                    <span className="text-sm">Page {currentPage} of {Math.ceil(resourcesToDisplay.length / pageSize)}</span>
                                    <div className="flex space-x-2">
                                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="px-4 py-2 bg-white rounded shadow-sm text-sm font-bold cursor-pointer">Prev</button>
                                        <button onClick={() => setCurrentPage(p => p + 1)} className="px-4 py-2 bg-white rounded shadow-sm text-sm font-bold cursor-pointer">Next</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <HowItWorks />

            <section className="max-w-7xl mx-auto px-4 py-16">
                <div className="bg-blue-50 rounded-2xl p-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="text-center">
                        <Book className="w-12 h-12 text-blue-900 mx-auto mb-4" />
                        <h4 className="font-bold mb-2">File Formats</h4>
                        <p className="text-sm text-gray-600">PDF, EPUB, DOC, DOCX. Max 50MB.</p>
                    </div>
                    <div className="text-center">
                        <CheckCircle className="w-12 h-12 text-blue-900 mx-auto mb-4" />
                        <h4 className="font-bold mb-2">Metadata</h4>
                        <p className="text-sm text-gray-600">Accurate author and keyword required.</p>
                    </div>
                    <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-blue-900 mx-auto mb-4" />
                        <h4 className="font-bold mb-2">Review</h4>
                        <p className="text-sm text-gray-600">Reviewed within 3 business days.</p>
                    </div>
                </div>
            </section>

            <CatalogModal
                isOpen={showCatalogModal}
                onClose={() => setShowCatalogModal(false)}
                catalogData={catalogData}
                onCatalogDataChange={(field, val) => setCatalogData(p => ({ ...p, [field]: val }))}
                onSubmit={handleCatalogSubmit}
            />
        </div>
    );
};

export default Home;
