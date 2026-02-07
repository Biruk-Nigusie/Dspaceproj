import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useAuth } from "../contexts/AuthContext";
import { Search, Eye, X, FileText, Download, User, Calendar, BookOpen, Hash, Globe, Info, MessageSquare, Award, Database, Tag, Shield, Layers, Package, CheckCircle2, AlertCircle } from "lucide-react";

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Column configurations for different collection types based on DSpace metadata
const COLUMN_CONFIGS = {
    // Archive collections (Archival File, Archival Folder, etc.)
    archive: [
        { label: "Reference Code", field: "refcode", sortable: true },
        { label: "CID", field: "cid", sortable: true },
        { label: "Title", field: "title", sortable: true },
        { label: "Archive Type", field: "archivalType", sortable: true },
        { label: "Temporal Coverage", field: "temporal", sortable: true },
        { label: "Calendar Type", field: "calendarType", sortable: true },
    ],

    // Printed Material collections (Book, Ethiopian Studies, Legal Deposits)
    printed: [
        { label: "Title", field: "title", sortable: true },
        { label: "Author", field: "authors", sortable: true },
        { label: "Type", field: "resource_type", sortable: true },
        { label: "Issued Date", field: "year", sortable: true },
        { label: "CID", field: "cid", sortable: true },
        { label: "Accession No.", field: "accessionNumber", sortable: true },
        { label: "ISBN", field: "isbn", sortable: true },
        { label: "Physical Description", field: "extent", sortable: true },
        { label: "Office", field: "offices", sortable: true },
    ],

    // Serial collections (Journal, Magazine, Newspapers)
    serial: [
        { label: "Title", field: "title", sortable: true },
        { label: "Author/Editor", field: "authors", sortable: true },
        { label: "Type", field: "newspaperType", sortable: true },
        { label: "Publisher", field: "publisher", sortable: true },
        { label: "Issued Date", field: "year", sortable: true },
        { label: "CID", field: "cid", sortable: true },
        { label: "Classification", field: "classification", sortable: true },
    ],

    // Multimedia collections (Film, Microfilm, Music)
    multimedia: [
        { label: "Title", field: "title", sortable: true },
        { label: "Creator", field: "authors", sortable: true },
        { label: "Type", field: "resource_type", sortable: true },
        { label: "Format", field: "format", sortable: true },
        { label: "Date Created", field: "creationDate", sortable: true },
        { label: "Duration", field: "duration", sortable: true },
        { label: "CID", field: "cid", sortable: true },
    ],

    // Default columns for mixed or unknown collections
    default: [
        { label: "Title", field: "title", sortable: true },
        { label: "Author", field: "authors", sortable: true },
        { label: "Type", field: "resource_type", sortable: true },
        { label: "CID", field: "cid", sortable: true },
        { label: "Year", field: "year", sortable: true },
    ]
};

const ResourceTable = ({ resources, loading, onCatalogClick, sortConfig, onSort, communityType = 'default' }) => {
    const { user } = useAuth();
    const isAuthenticated = !!user;
    const [previewLoading, setPreviewLoading] = useState({});
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedResource, setSelectedResource] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [pdfLoading, setPdfLoading] = useState(true);

    const allColumns = COLUMN_CONFIGS[communityType] || COLUMN_CONFIGS.default;
    const columns = allColumns.slice(0, 5);
    const extraColumns = allColumns.slice(5);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setPdfLoading(false);
    }

    const handleDownload = () => {
        if (!previewUrl) return;
        const link = document.createElement("a");
        link.href = previewUrl;
        const filename = previewUrl.split("/").pop() || "document.pdf";
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePreview = async (resource, e) => {
        if (e) e.stopPropagation();
        let url = "";
        if (resource.source === "dspace") {
            if (resource.preview_url) {
                url = resource.preview_url;
            } else if (resource.external_id) {
                url = `/api/resources/dspace-bitstream/${resource.external_id}/`;
            } else if (resource.id && resource.id.startsWith("dspace_")) {
                const itemUuid = resource.id.replace("dspace_", "");
                url = `/api/resources/dspace-bitstream/${itemUuid}/`;
            }
        }

        if (url) {
            setPreviewUrl(url);
            setPageNumber(1);
            setPdfLoading(true);
            setShowPreviewModal(true);
            setShowDetailModal(false); // Close detail modal if open
        }
    };

    const handleRowClick = (resource) => {
        setSelectedResource(resource);
        setShowDetailModal(true);
    };

    const handleEyeClick = (resource, e) => {
        e.stopPropagation();
        setSelectedResource(resource);
        setShowDetailModal(true);
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
                <p className="mt-4 text-gray-600 text-lg">መዛግብት እና መጻሕፍት በመጫን ላይ...</p>
            </div>
        );
    }

    if (resources.length === 0) {
        return (
            <div className="text-center py-12 border border-gray-200 rounded-lg">
                <svg
                    className="w-16 h-16 text-gray-400 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    ምንም መዝገቦች አልተገኙም
                </h3>
                <p className="text-gray-600 mb-4">
                    የፍለጋ መስፈርቶችዎን ማስተካከል ወይም በምድብ ማሰስ ይሞክሩ
                </p>
            </div>
        );
    }

    const MetadataField = ({ icon: Icon, label, value }) => {
        if (!value || (typeof value === 'string' && value.trim() === '')) return null;
        return (
            <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors px-2 rounded-sm">
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

    const getIconForField = (field) => {
        const iconMap = {
            authors: User, author: User, creators: User, composers: User, singers: User,
            year: Calendar, date: Calendar, creationDate: Calendar, issued: Calendar,
            publisher: BookOpen, series: Layers, classification: Hash,
            cid: Hash, refcode: Hash, accessionNumber: Hash, isbn: Hash, issn: Hash, reportNo: Hash,
            language: Globe, calendarType: Globe,
            format: Package, medium: Layers, extent: Layers, duration: Package, quantity: Package,
            archivalType: Info, newspaperType: Info, resource_type: Info, processing: Tag,
            security: Shield, provenance: Info, arrangement: Info, sponsors: Award,
            offices: Database
        };
        return iconMap[field] || Info;
    };

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

    // Helper to format field names for display
    const formatLabel = (key) => {
        // Check if we have a label in COLUMN_CONFIGS
        for (const config of Object.values(COLUMN_CONFIGS)) {
            const found = config.find(c => c.field === key);
            if (found) return found.label;
        }

        // Fallback to capitalizing and spacing
        return key.replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .replace(/_/g, ' ');
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-2">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.field}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-widest cursor-pointer group"
                                    onClick={() => col.sortable && onSort(col.field)}
                                >
                                    <div className="flex items-center space-x-2">
                                        <span>{col.label}</span>
                                        {col.sortable && <SortIcon field={col.field} />}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {resources.map((resource) => (
                            <tr
                                key={resource.id}
                                className="hover:bg-gray-50 cursor-pointer transition-colors group/row"
                                onClick={() => handleRowClick(resource)}
                            >
                                {columns.map((col) => (
                                    <td key={col.field} className="px-6 py-4 text-sm whitespace-normal">
                                        {col.field === 'title' ? (
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm font-bold text-blue-900 group-hover/row:text-blue-700 transition-colors">
                                                    {resource[col.field] || "—"}
                                                </div>
                                                <button
                                                    onClick={(e) => handleEyeClick(resource, e)}
                                                    className="p-1 text-blue-600 bg-blue-50 rounded-full transition-all opacity-0 group-hover/row:opacity-100 cursor-pointer"
                                                    title="View Details"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-gray-700 font-medium">
                                                {resource[col.field] || "—"}
                                            </div>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Detailed Metadata Modal */}
            {showDetailModal && selectedResource && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl relative animate-in fade-in zoom-in duration-200 overflow-hidden">
                        {/* Modal Header */}
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-blue-900 tracking-tight flex items-center gap-2">
                                <Info size={20} /> መዛግብት ዝርዝር መረጃ (Details)
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
                            <div className="mb-6 pb-6 border-b border-gray-100 italic">
                                <h4 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{selectedResource.title}</h4>
                                {selectedResource.altTitle && (
                                    <p className="text-sm text-gray-500 mb-3">{selectedResource.altTitle}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {selectedResource.is_cataloged && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-sm uppercase tracking-widest border border-indigo-100">
                                            <CheckCircle2 size={10} /> Cataloged in Koha
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                {/* First: Show extra columns that were hidden from the table */}
                                {extraColumns.map(col => (
                                    <MetadataField
                                        key={col.field}
                                        icon={getIconForField(col.field)}
                                        label={col.label}
                                        value={selectedResource[col.field]}
                                    />
                                ))}

                                {/* Second: Show other available metadata fields dynamically */}
                                {Object.entries(selectedResource)
                                    .filter(([key, value]) => {
                                        // Filter out internal fields and already displayed fields
                                        const internalFields = [
                                            'id', 'title', 'altTitle', 'source', 'source_name',
                                            'preview_url', 'external_id', 'is_cataloged', 'koha_id',
                                            'abstract', 'description', 'citation', 'subjects'
                                        ];
                                        const tableFields = columns.map(c => c.field);
                                        const extraFields = extraColumns.map(c => c.field);

                                        return value &&
                                            !internalFields.includes(key) &&
                                            !tableFields.includes(key) &&
                                            !extraFields.includes(key);
                                    })
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .map(([key, value]) => (
                                        <MetadataField
                                            key={key}
                                            icon={getIconForField(key)}
                                            label={formatLabel(key)}
                                            value={value}
                                        />
                                    ))
                                }
                            </div>

                            {selectedResource.subjects && (
                                <div className="mt-8">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                                        <Hash size={12} /> Keywords
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedResource.subjects.split(", ").map((tag, idx) => (
                                            <span key={idx} className="bg-gray-50 text-gray-700 px-3 py-1 rounded-full text-xs font-medium border border-gray-200">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedResource.abstract && (
                                <div className="mt-8 p-4 bg-gray-50 rounded-sm border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <MessageSquare size={12} /> Abstract / Summary
                                    </p>
                                    <p className="text-sm text-gray-700 leading-relaxed font-semibold italic">
                                        {selectedResource.abstract}
                                    </p>
                                </div>
                            )}

                            {selectedResource.description && selectedResource.description !== selectedResource.abstract && (
                                <div className="mt-4 p-4 bg-blue-50/30 rounded-sm border border-blue-100/50">
                                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <Info size={12} /> Additional Description
                                    </p>
                                    <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                        {selectedResource.description}
                                    </p>
                                </div>
                            )}

                            {selectedResource.citation && (
                                <div className="mt-6">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Preferred Citation</p>
                                    <p className="text-xs text-gray-600 bg-zinc-50 p-3 border-l-2 border-blue-400 rounded-r-sm font-mono leading-relaxed">
                                        {selectedResource.citation}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 px-6 py-4 flex flex-wrap items-center justify-end gap-3 border-t border-gray-100">
                            {selectedResource.source === "dspace" && (
                                <>
                                    <button
                                        onClick={(e) => handlePreview(selectedResource, e)}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold uppercase tracking-widest transition-all rounded-sm shadow-md hover:shadow-lg cursor-pointer min-w-[140px]"
                                    >
                                        <FileText size={18} /> Preview
                                    </button>
                                    {isAuthenticated && !selectedResource.is_cataloged && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCatalogClick(selectedResource);
                                                setShowDetailModal(false);
                                            }}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold uppercase tracking-widest transition-all rounded-sm shadow-md hover:shadow-lg cursor-pointer min-w-[140px]"
                                        >
                                            <Database size={18} /> Catalog
                                        </button>
                                    )}
                                    {selectedResource.is_cataloged && (
                                        <button
                                            onClick={() => {
                                                const kohaId = selectedResource.koha_id || selectedResource.external_id;
                                                window.open(`http://127.0.0.1:8085/cgi-bin/koha/catalogue/detail.pl?biblionumber=${kohaId}`, "_blank");
                                            }}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-bold uppercase tracking-widest transition-all rounded-sm shadow-md hover:shadow-lg cursor-pointer min-w-[140px]"
                                        >
                                            <Download size={18} /> Borrow
                                        </button>
                                    )}
                                </>
                            )}
                            {(selectedResource.source === "koha" || selectedResource.is_cataloged) && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            const kohaId = selectedResource.koha_id || selectedResource.external_id;
                                            window.open(`http://127.0.0.1:8085/cgi-bin/koha/catalogue/detail.pl?biblionumber=${kohaId}`, "_blank");
                                        }}
                                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold uppercase tracking-widest transition-all rounded-sm shadow-md hover:shadow-lg cursor-pointer min-w-[140px]"
                                    >
                                        <Search size={18} /> View in Koha Catalog
                                    </button>
                                    <button
                                        onClick={() => {
                                            const kohaId = selectedResource.koha_id || selectedResource.external_id;
                                            window.open(`http://127.0.0.1:8085/cgi-bin/koha/catalogue/detail.pl?biblionumber=${kohaId}`, "_blank");
                                        }}
                                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-bold uppercase tracking-widest transition-all rounded-sm shadow-md hover:shadow-lg cursor-pointer min-w-[40px]"
                                    >
                                        <Download size={18} /> Borrow Item
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Full-screen PDF Preview Modal */}
            {showPreviewModal && (
                <div className="fixed inset-0 z-[70] flex flex-col bg-black bg-opacity-95 overflow-hidden">
                    {/* Preview Modal Header */}
                    <div className="flex justify-between items-center px-6 py-4 bg-gray-900 border-b border-gray-800 text-white z-10 shadow-lg">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-semibold truncate max-w-md">
                                {selectedResource?.title || "Document Preview"}
                            </h3>
                            <div className="flex items-center bg-gray-800 rounded-lg px-2 py-1 gap-4 text-sm font-medium">
                                <button
                                    onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                                    disabled={pageNumber <= 1}
                                    className="hover:text-blue-400 disabled:opacity-30 disabled:hover:text-white transition-colors cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <span className="font-medium whitespace-nowrap min-w-[80px] text-center">
                                    Page {pageNumber} / {numPages || "--"}
                                </span>
                                <button
                                    onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                                    disabled={pageNumber >= numPages}
                                    className="hover:text-blue-400 disabled:opacity-30 disabled:hover:text-white transition-colors cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>

                            <div className="h-6 w-px bg-gray-700 mx-2" />

                            <div className="flex items-center bg-gray-800 rounded-lg px-2 py-1 gap-4 text-sm font-medium">
                                <button
                                    onClick={() => setScale(prev => Math.max(prev - 0.1, 0.5))}
                                    className="hover:text-blue-400 transition-colors cursor-pointer"
                                    title="Zoom Out"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <span className="font-medium w-12 text-center">
                                    {Math.round(scale * 100)}%
                                </span>
                                <button
                                    onClick={() => setScale(prev => Math.min(prev + 0.1, 3.0))}
                                    className="hover:text-blue-400 transition-colors cursor-pointer"
                                    title="Zoom In"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 5a1 1 0 011-1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>

                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            >
                                <Download size={16} /> Download
                            </button>
                        </div>

                        <button
                            onClick={() => setShowPreviewModal(false)}
                            className="p-2 hover:bg-red-600/30 text-gray-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                            aria-label="Close preview"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-auto bg-gray-100 dark:bg-zinc-900 scroll-smooth">
                        <div className="flex flex-col items-center py-8 min-h-full">
                            {pdfLoading && (
                                <div className="flex flex-col items-center justify-center p-12">
                                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                    <p className="mt-4 text-gray-600 font-bold">መረጃው በመጫን ላይ ነው...</p>
                                </div>
                            )}
                            <div className={`transition-opacity duration-300 ${pdfLoading ? 'opacity-0 h-0' : 'opacity-100 shadow-2xl'}`}>
                                <Document
                                    file={previewUrl}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    loading={null}
                                    onLoadError={(error) => console.error("PDF Load Error:", error)}
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
