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

const Home = () => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCollections, setSelectedCollections] = useState([]);
    const [activeFilters, setActiveFilters] = useState({});
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

    // Flatten hierarchy for lookup
    const collections = useMemo(() => {
        const flatten = (nodes) => {
            let flat = [];
            nodes.forEach(node => {
                flat.push(node);
                if (node.children) {
                    flat = [...flat, ...flatten(node.children)];
                }
            });
            return flat;
        };
        return flatten(dspaceHierarchy);
    }, [dspaceHierarchy]);

    // Helper to map DSpace API items
    const mapDspaceItem = (item) => {
        const metadata = item._embedded?.indexableObject?.metadata || {};
        const getVal = (key) => metadata[key]?.[0]?.value || "";
        const getValList = (key) => metadata[key]?.map(m => m.value).join(", ") || "";

        return {
            id: item._embedded?.indexableObject?.uuid,
            title: getVal("dc.title") || item._embedded?.indexableObject?.name,
            authors: getValList("dc.contributor.author"),
            year: getVal("dc.date.issued")?.substring(0, 4),
            publisher: getVal("dc.publisher"),
            source: "dspace",
            source_name: "Digital Repository",
            resource_type: item._embedded?.indexableObject?.metadata?.["dc.type"]?.[0]?.value || "Digital",
            external_id: item._embedded?.indexableObject?.handle || item._embedded?.indexableObject?.uuid,
            description: getVal("dc.description") || getVal("dc.description.abstract"),
            language: getVal("dc.language") || getVal("dc.language.iso"),
            reportNo: getVal("dc.identifier.govdoc") || getVal("dc.identifier.other"),
            subjects: getValList("dc.subject"),
            // Archive specific
            archivalType: getVal("dc.type.archival"),
            calendarType: getVal("dc.date.calendartype"),
            medium: getVal("local.archival.medium"),
            arrangement: getVal("local.arrangement.level"),
            processing: getVal("local.archival.processing"),
            security: getVal("local.archival.security"),
            provenance: getVal("dc.provenance"),
            quantity: getVal("local.archival.quantity"),
            // Printed/Serial specific
            isbn: getVal("dc.identifier.isbn"),
            issn: getVal("dc.identifier.issn"),
            extent: getVal("dc.format.extent"),
            series: getVal("dc.relation.ispartofseries"),
            citation: getVal("dc.identifier.citation"),
            abstract: getVal("dc.description.abstract"),
            // Flags
            is_cataloged: !!item._embedded?.indexableObject?.metadata?.["local.koha.id"],
            koha_id: getVal("local.koha.id")
        };
    };

    // 2. Main Resource Query
    const { data: allResources = [], isLoading: loading } = useQuery({
        queryKey: ['resources', searchQuery, selectedCollections.map(c => c.uuid || c.id)],
        queryFn: async () => {
            if (selectedCollections.length > 0) {
                const results = [];
                for (const col of selectedCollections) {
                    const id = col.uuid || col.id;
                    const items = await dspaceService.searchItems(searchQuery || "*", 100, id);
                    results.push(...items.filter(i => i._embedded?.indexableObject?.type === 'item').map(mapDspaceItem));
                }
                return results;
            } else {
                const dspaceResults = await dspaceService.searchItems(searchQuery);
                const mappedDspace = dspaceResults
                    .filter(item => item._embedded?.indexableObject?.type === 'item')
                    .map(mapDspaceItem);

                let mappedKoha = [];
                try {
                    const kohaResponse = await axios.get(`/api/resources/search/`, {
                        params: { q: searchQuery, source: 'koha', limit: 50 }
                    });
                    if (kohaResponse.data?.results) {
                        mappedKoha = kohaResponse.data.results.map(item => ({
                            ...item,
                            source: 'koha',
                            source_name: 'Cataloged'
                        }));
                    }
                } catch (e) {
                    console.error("Koha error", e);
                }
                return [...mappedDspace, ...mappedKoha];
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });

    const communityType = useMemo(() => {
        if (selectedCollections.length === 0) return 'default';
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
        if (!path) return 'default';

        const subComm = path.find(node => ["Archive", "Multimedia", "Printed Material", "Serial"].includes(node.name));
        if (!subComm) return 'default';

        if (subComm.name === "Archive") return "archive";
        if (subComm.name === "Multimedia") return "multimedia";
        if (subComm.name === "Printed Material") return "printed";
        if (subComm.name === "Serial") return "serial";
        return 'default';
    }, [selectedCollections, dspaceHierarchy]);

    const { data: stats = { totalResources: 12457, monthlyDownloads: 5678, activeUsers: 890, communities: 12 } } = useQuery({
        queryKey: ['stats'],
        queryFn: async () => ({ totalResources: 12457, monthlyDownloads: 5678, activeUsers: 890, communities: 12 }),
    });

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const q = params.get('q');
        const colIdsRaw = params.get('collections');

        if (q && q !== searchQuery) setSearchQuery(q);

        if (colIdsRaw && collections.length > 0) {
            const colIds = colIdsRaw.split(',').filter(id => id);
            const found = collections.filter(c => colIds.includes(c.uuid || c.id));
            if (found.length > 0) {
                const currentIds = selectedCollections.map(c => c.uuid || c.id).sort().join(',');
                const foundIds = found.map(c => c.uuid || c.id).sort().join(',');
                if (currentIds !== foundIds) {
                    setSelectedCollections(found);
                }
            }
        } else if (!colIdsRaw && selectedCollections.length > 0) {
            setSelectedCollections([]);
        }
    }, [location.search, collections, selectedCollections, searchQuery]);

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
        const id = collection.uuid || collection.id;
        const currentParams = new URLSearchParams(location.search);
        let currentSelected = currentParams.get('collections')?.split(',').filter(x => x) || [];

        if (currentSelected.includes(id)) {
            currentParams.delete('collections');
        } else {
            currentParams.set('collections', id);
            setActiveFilters({});
        }
        navigate(`/?${currentParams.toString()}`);
    };

    const applyTreeFilters = (resources) => {
        if (!activeFilters || Object.keys(activeFilters).length === 0) return resources;
        return resources.filter(resource => {
            for (const [category, selectedValues] of Object.entries(activeFilters)) {
                if (!selectedValues || selectedValues.length === 0) continue;
                let resourceValue;
                if (category === 'source') {
                    resourceValue = resource.source_name || (resource.source === 'koha' ? 'Cataloged' : 'Digital');
                } else if (category === 'type') {
                    resourceValue = resource.resource_type || 'Unknown';
                } else if (category === 'year') {
                    resourceValue = resource.year;
                } else if (category === 'language') {
                    resourceValue = resource.language === 'en' || resource.language === 'English' ? 'English' :
                        resource.language === 'am' || resource.language === 'Amharic' ? 'Amharic' : resource.language || 'Unknown';
                } else if (category === 'author') {
                    const authors = (resource.authors || "").toLowerCase();
                    if (!selectedValues.some(val => authors.includes(val.toLowerCase()))) return false;
                    continue;
                } else if (category === 'publisher') {
                    resourceValue = resource.publisher || 'Unknown';
                }
                if (!selectedValues.includes(resourceValue)) return false;
            }
            return true;
        });
    };

    const getSubCommunitiesToDisplay = () => {
        const subs = dspaceHierarchy.flatMap(node => node.children || []);
        const targetNames = ["Archive", "Multimedia", "Printed Material", "Serial"];
        const mainSubs = subs.filter(node => targetNames.includes(node.name));
        return mainSubs.length > 0 ? mainSubs : subs.slice(0, 4);
    };

    const filteredResources = applyTreeFilters(allResources);
    const resourcesToDisplay = useMemo(() => {
        if (!sortConfig.field) return filteredResources;
        return [...filteredResources].sort((a, b) => {
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
                            placeholder="Search through archives, books, manuscripts..."
                            className="flex-1 h-14 pl-4 pr-6 text-base focus:outline-none font-medium"
                        />
                        <button className="bg-blue-900 text-white h-14 px-8 font-bold uppercase tracking-wider text-xs">Search</button>
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
                                resources={allResources}
                                dspaceHierarchy={dspaceHierarchy}
                                selectedFilters={activeFilters}
                                onFilterChange={(cat, vals) => setActiveFilters(p => ({ ...p, [cat]: vals }))}
                                onClearFilters={() => { setActiveFilters({}); setSelectedCollections([]); }}
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
