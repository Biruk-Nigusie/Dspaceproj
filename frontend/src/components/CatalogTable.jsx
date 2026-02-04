import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Search, Eye, X, FileText, Download, User, Calendar, BookOpen, Hash, Globe, Info, MessageSquare, Award, Database, Tag, Shield, Layers, Package, CheckCircle2, AlertCircle, Filter, RefreshCw, ExternalLink } from "lucide-react";

const CatalogTable = () => {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [collections, setCollections] = useState({});
    const [columnConfigs, setColumnConfigs] = useState({});
    
    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [selectedSource, setSelectedSource] = useState("");
    const [selectedYear, setSelectedYear] = useState("");
    const [selectedAuthor, setSelectedAuthor] = useState("");
    const [selectedPublisher, setSelectedPublisher] = useState("");
    
    // UI states
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [sortConfig, setSortConfig] = useState({ field: 'title', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    
    // Determine current collection type based on filters
    const currentCollectionType = useMemo(() => {
        if (selectedType) return selectedType;
        
        // Auto-detect from current items
        const types = [...new Set(filteredItems.map(item => item.collection_type || 'default'))];
        return types.length === 1 ? types[0] : 'default';
    }, [selectedType, filteredItems]);
    
    // Get columns for current collection type
    const currentColumns = useMemo(() => {
        return columnConfigs[currentCollectionType] || columnConfigs.default || [];
    }, [columnConfigs, currentCollectionType]);
    
    // Load collections and initial data
    useEffect(() => {
        loadCollections();
        loadItems();
    }, []);
    
    // Apply filters when they change
    useEffect(() => {
        applyFilters();
    }, [items, searchQuery, selectedType, selectedSource, selectedYear, selectedAuthor, selectedPublisher]);
    
    const loadCollections = async () => {
        try {
            const response = await fetch('/api/resources/catalog/collections/');
            if (response.ok) {
                const data = await response.json();
                setCollections(data.collections || {});
                setColumnConfigs(data.column_configs || {});
            }
        } catch (error) {
            console.error('Failed to load collections:', error);
        }
    };
    
    const loadItems = async (additionalFilters = {}) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: '100',
                ...additionalFilters
            });
            
            const response = await fetch(`/api/resources/catalog/items/?${params}`);
            if (response.ok) {
                const data = await response.json();
                setItems(data.items || []);
                console.log(`✅ Loaded ${data.items?.length || 0} catalog items`);
            } else {
                console.error('Failed to load items:', response.status);
                setItems([]);
            }
        } catch (error) {
            console.error('Error loading items:', error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };
    
    const applyFilters = () => {
        let filtered = [...items];
        
        // Text search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item => 
                item.title?.toLowerCase().includes(query) ||
                item.authors?.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query) ||
                item.subjects?.toLowerCase().includes(query)
            );
        }
        
        // Type filter
        if (selectedType) {
            filtered = filtered.filter(item => 
                item.collection_type === selectedType || 
                item.resource_type?.toLowerCase() === selectedType.toLowerCase()
            );
        }
        
        // Source filter
        if (selectedSource) {
            filtered = filtered.filter(item => item.source === selectedSource);
        }
        
        // Year filter
        if (selectedYear) {
            filtered = filtered.filter(item => 
                item.year?.toString().includes(selectedYear)
            );
        }
        
        // Author filter
        if (selectedAuthor) {
            filtered = filtered.filter(item => 
                item.authors?.toLowerCase().includes(selectedAuthor.toLowerCase())
            );
        }
        
        // Publisher filter
        if (selectedPublisher) {
            filtered = filtered.filter(item => 
                item.publisher?.toLowerCase().includes(selectedPublisher.toLowerCase())
            );
        }
        
        // Apply sorting
        if (sortConfig.field) {
            filtered.sort((a, b) => {
                const aVal = a[sortConfig.field] || '';
                const bVal = b[sortConfig.field] || '';
                
                if (sortConfig.direction === 'asc') {
                    return aVal.toString().localeCompare(bVal.toString());
                } else {
                    return bVal.toString().localeCompare(aVal.toString());
                }
            });
        }
        
        setFilteredItems(filtered);
        setCurrentPage(1); // Reset to first page when filters change
    };
    
    const handleSort = (field) => {
        setSortConfig(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };
    
    const handleSearch = () => {
        const filters = {};
        if (searchQuery.trim()) filters.q = searchQuery.trim();
        if (selectedType) filters.type = selectedType;
        if (selectedSource) filters.source = selectedSource;
        if (selectedYear) filters.year = selectedYear;
        if (selectedAuthor) filters.author = selectedAuthor;
        if (selectedPublisher) filters.publisher = selectedPublisher;
        
        loadItems(filters);
    };
    
    const clearFilters = () => {
        setSearchQuery("");
        setSelectedType("");
        setSelectedSource("");
        setSelectedYear("");
        setSelectedAuthor("");
        setSelectedPublisher("");
        loadItems();
    };
    
    const handleItemClick = (item) => {
        setSelectedItem(item);
        setShowDetailModal(true);
    };
    
    const handleLoanClick = (item, e) => {
        e.stopPropagation();
        
        // Open Koha loan page
        if (item.loan_url) {
            window.open(item.loan_url, '_blank');
        } else if (item.source === 'koha' && item.external_id) {
            window.open(`http://127.0.0.1:8085/cgi-bin/koha/opac-detail.pl?biblionumber=${item.external_id}`, '_blank');
        } else if (item.url) {
            window.open(item.url, '_blank');
        }
    };
    
    // Pagination
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);
    
    // Get unique values for filter dropdowns
    const uniqueTypes = [...new Set(items.map(item => item.collection_type || item.resource_type).filter(Boolean))];
    const uniqueSources = [...new Set(items.map(item => item.source).filter(Boolean))];
    const uniqueYears = [...new Set(items.map(item => item.year).filter(Boolean))].sort((a, b) => b - a);
    const uniqueAuthors = [...new Set(items.map(item => item.authors).filter(Boolean))].slice(0, 20);
    const uniquePublishers = [...new Set(items.map(item => item.publisher).filter(Boolean))].slice(0, 20);
    
    const SortIcon = ({ field }) => {
        if (sortConfig.field !== field) {
            return (
                <div className="flex flex-col -space-y-1 opacity-20 group-hover:opacity-100 transition-opacity">
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" /></svg>
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                </div>
            );
        }
        return sortConfig.direction === 'asc' ? (
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" /></svg>
        ) : (
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
        );
    };
    
    const MetadataField = ({ icon: Icon, label, value }) => {
        if (!value) return null;
        return (
            <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                <div className="mt-1 p-1.5 bg-blue-50 rounded-md text-blue-600">
                    <Icon size={16} />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5 leading-relaxed">{value}</p>
                </div>
            </div>
        );
    };
    
    if (loading && items.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
                <p className="mt-4 text-gray-600 text-lg">Loading catalog items...</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {/* Filters Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={20} className="text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Search & Filter Catalog</h3>
                </div>
                
                {/* Search Bar */}
                <div className="mb-4">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search titles, authors, subjects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <Search size={16} />
                            Search
                        </button>
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                            <X size={16} />
                            Clear
                        </button>
                    </div>
                </div>
                
                {/* Filter Dropdowns */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Types</option>
                        {uniqueTypes.map(type => (
                            <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                        ))}
                    </select>
                    
                    <select
                        value={selectedSource}
                        onChange={(e) => setSelectedSource(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Sources</option>
                        {uniqueSources.map(source => (
                            <option key={source} value={source}>{source.toUpperCase()}</option>
                        ))}
                    </select>
                    
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Years</option>
                        {uniqueYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    
                    <select
                        value={selectedAuthor}
                        onChange={(e) => setSelectedAuthor(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Authors</option>
                        {uniqueAuthors.map(author => (
                            <option key={author} value={author}>{author}</option>
                        ))}
                    </select>
                    
                    <select
                        value={selectedPublisher}
                        onChange={(e) => setSelectedPublisher(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Publishers</option>
                        {uniquePublishers.map(publisher => (
                            <option key={publisher} value={publisher}>{publisher}</option>
                        ))}
                    </select>
                    
                    <button
                        onClick={() => loadItems()}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>
            </div>
            
            {/* Results Summary */}
            <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                    Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} items
                    {currentCollectionType !== 'default' && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {currentCollectionType.charAt(0).toUpperCase() + currentCollectionType.slice(1)} Collection
                        </span>
                    )}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-600">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
            
            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-12">
                        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No items found</h3>
                        <p className="text-gray-600 mb-4">Try adjusting your search criteria or filters</p>
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Clear All Filters
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {currentColumns.map((col) => (
                                        <th
                                            key={col.field}
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-widest cursor-pointer group"
                                            onClick={() => col.sortable && handleSort(col.field)}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <span>{col.label}</span>
                                                {col.sortable && <SortIcon field={col.field} />}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-widest">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedItems.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors group/row"
                                        onClick={() => handleItemClick(item)}
                                    >
                                        {currentColumns.map((col) => (
                                            <td key={col.field} className="px-6 py-4 text-sm whitespace-normal">
                                                {col.field === 'title' ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-sm font-bold text-blue-900 group-hover/row:text-blue-700 transition-colors">
                                                            {item[col.field] || "—"}
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleItemClick(item);
                                                                }}
                                                                className="p-1 text-blue-600 bg-blue-50 rounded-full transition-all cursor-pointer"
                                                                title="View Details"
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                            {item.source === 'koha' && (
                                                                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                                                    Cataloged
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-700 font-medium">
                                                        {item[col.field] || "—"}
                                                    </div>
                                                )}
                                            </td>
                                        ))}
                                        <td className="px-6 py-4 text-sm">
                                            <button
                                                onClick={(e) => handleLoanClick(item, e)}
                                                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition-colors"
                                                title="Borrow/Loan Item"
                                            >
                                                <ExternalLink size={12} />
                                                {item.source === 'koha' ? 'Borrow' : 'View'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {/* Detail Modal */}
            {showDetailModal && selectedItem && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl relative animate-in fade-in zoom-in duration-200 overflow-hidden">
                        {/* Modal Header */}
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-blue-900 tracking-tight flex items-center gap-2">
                                <Info size={20} /> Item Details
                            </h3>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-gray-900"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 max-h-[70vh] overflow-y-auto scroll-smooth">
                            <div className="mb-6 pb-6 border-b border-gray-100">
                                <h4 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{selectedItem.title}</h4>
                                <div className="flex flex-wrap gap-2 mt-4">
                                    <span className={`px-2 py-1 text-xs font-bold rounded-sm uppercase tracking-widest ${
                                        selectedItem.source === 'koha' 
                                            ? 'bg-green-50 text-green-700 border border-green-100' 
                                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                                    }`}>
                                        {selectedItem.source_name || selectedItem.source}
                                    </span>
                                    {selectedItem.collection_type && (
                                        <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-sm uppercase tracking-widest border border-purple-100">
                                            {selectedItem.collection_type}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                <MetadataField icon={User} label="Author" value={selectedItem.authors} />
                                <MetadataField icon={Calendar} label="Year" value={selectedItem.year} />
                                <MetadataField icon={BookOpen} label="Publisher" value={selectedItem.publisher} />
                                <MetadataField icon={Hash} label="ISBN" value={selectedItem.isbn} />
                                <MetadataField icon={Hash} label="ISSN" value={selectedItem.issn} />
                                <MetadataField icon={Globe} label="Language" value={selectedItem.language} />
                                <MetadataField icon={Info} label="Type" value={selectedItem.resource_type} />
                                <MetadataField icon={Package} label="Availability" value={selectedItem.availability} />
                                
                                {/* Collection-specific fields */}
                                {selectedItem.collection_type === 'archive' && (
                                    <>
                                        <MetadataField icon={Layers} label="Archival Type" value={selectedItem.archivalType} />
                                        <MetadataField icon={Info} label="Provenance" value={selectedItem.provenance} />
                                        <MetadataField icon={Package} label="Quantity" value={selectedItem.quantity} />
                                        <MetadataField icon={Shield} label="Security" value={selectedItem.security} />
                                        <MetadataField icon={Layers} label="Medium" value={selectedItem.medium} />
                                        <MetadataField icon={Info} label="Arrangement" value={selectedItem.arrangement} />
                                    </>
                                )}
                                
                                {selectedItem.collection_type === 'serial' && (
                                    <MetadataField icon={BookOpen} label="Series" value={selectedItem.series} />
                                )}
                                
                                {selectedItem.collection_type === 'multimedia' && (
                                    <>
                                        <MetadataField icon={Layers} label="Extent" value={selectedItem.extent} />
                                        <MetadataField icon={Layers} label="Medium" value={selectedItem.medium} />
                                    </>
                                )}
                            </div>

                            {selectedItem.subjects && (
                                <div className="mt-8">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                                        <Hash size={12} /> Keywords
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedItem.subjects.split(", ").map((tag, idx) => (
                                            <span key={idx} className="bg-gray-50 text-gray-700 px-3 py-1 rounded-full text-xs font-medium border border-gray-200">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedItem.abstract && (
                                <div className="mt-8 p-4 bg-gray-50 rounded-sm border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <MessageSquare size={12} /> Abstract
                                    </p>
                                    <p className="text-sm text-gray-700 leading-relaxed font-semibold italic">
                                        {selectedItem.abstract}
                                    </p>
                                </div>
                            )}

                            {selectedItem.description && selectedItem.description !== selectedItem.abstract && (
                                <div className="mt-4 p-4 bg-blue-50/30 rounded-sm border border-blue-100/50">
                                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <Info size={12} /> Description
                                    </p>
                                    <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                        {selectedItem.description}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 px-6 py-4 flex flex-wrap items-center justify-end gap-3 border-t border-gray-100">
                            <button
                                onClick={() => handleLoanClick(selectedItem)}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold uppercase tracking-widest transition-all rounded-sm shadow-md hover:shadow-lg cursor-pointer min-w-[140px]"
                            >
                                <ExternalLink size={18} />
                                {selectedItem.source === 'koha' ? 'Borrow Item' : 'View in Repository'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CatalogTable;