import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Filter, X, Plus, Minus, Folder, LayoutGrid, Database, Globe } from 'lucide-react';

const MetadataTreeFilter = ({
    resources,
    dspaceHierarchy = [],
    onFilterChange,
    selectedFilters = {},
    onClearFilters,
    onCollectionClick,
    className = ""
}) => {
    const [expandedNodes, setExpandedNodes] = useState({
        branch_root: true,
        type_root: true,
        branch: true,
        type: true,
        year: false,
        language: false,
    });

    const toggleNode = (node) => {
        setExpandedNodes(prev => ({
            ...prev,
            [node]: !prev[node]
        }));
    };

    const filterOptions = useMemo(() => {
        if (!resources) return {};
        const options = {
            source: {},
            type: {},
            year: {},
            language: {},
        };

        resources.forEach(resource => {
            const source = resource.source_name || (resource.source === 'koha' ? 'Cataloged' : 'Digital');
            options.source[source] = (options.source[source] || 0) + 1;

            const type = resource.resource_type || 'Unknown';
            options.type[type] = (options.type[type] || 0) + 1;

            if (resource.year) {
                options.year[resource.year] = (options.year[resource.year] || 0) + 1;
            }

            const rawLang = resource.language || 'Unknown';
            const lang = rawLang === 'en' ? 'English' : (rawLang === 'am' ? 'Amharic' : rawLang);
            options.language[lang] = (options.language[lang] || 0) + 1;
        });

        return {
            source: Object.entries(options.source).sort((a, b) => b[1] - a[1]),
            type: Object.entries(options.type).sort((a, b) => b[1] - a[1]),
            year: Object.entries(options.year).sort((a, b) => b[0] - a[0]).reverse(),
            language: Object.entries(options.language).sort((a, b) => b[1] - a[1]),
        };
    }, [resources]);

    const hasAnyFilter = Object.keys(selectedFilters).length > 0;

    const CollapsibleSection = ({ id, label, icon: Icon, children }) => {
        const isExpanded = expandedNodes[id];
        return (
            <div className="mb-4 bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
                <button
                    onClick={() => toggleNode(id)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-800 font-semibold"
                >
                    <div className="flex items-center">
                        {Icon && <Icon className="w-4 h-4 mr-2 text-blue-900" />}
                        <span className="text-sm">{label}</span>
                    </div>
                    {isExpanded ? <Minus className="w-4 h-4 text-gray-500" /> : <Plus className="w-4 h-4 text-gray-500" />}
                </button>
                {isExpanded && <div className="p-2">{children}</div>}
            </div>
        );
    };

    const HierarchyNode = ({ node, level = 0 }) => {
        const [isExpanded, setIsExpanded] = useState(level < 1);
        const hasChildren = node.children && node.children.length > 0;

        return (
            <div className="select-none relative">
                <div
                    className={`flex items-center py-1.5 px-2 rounded-sm hover:bg-blue-50 cursor-pointer group transition-all relative z-10`}
                    style={{ paddingLeft: `${level * 16 + 8}px` }}
                >
                    {/* Horizontal connector line for children (except top level) */}
                    {level > 0 && (
                        <div
                            className="absolute border-t border-gray-300 w-3 left-0"
                            style={{ left: `${(level - 1) * 16 + 18}px`, top: '50%' }}
                        />
                    )}

                    <div
                        className="mr-1 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 bg-white relative z-10 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (hasChildren) setIsExpanded(!isExpanded);
                        }}
                    >
                        {hasChildren ? (
                            isExpanded ? <Minus className="w-3 h-3 text-gray-500" /> : <Plus className="w-3 h-3 text-gray-500" />
                        ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mx-auto" />
                        )}
                    </div>

                    <div
                        className="flex-1 flex items-center"
                        onClick={() => {
                            if (node.type === 'collection' && onCollectionClick) {
                                onCollectionClick(node);
                            }
                        }}
                    >
                        <span className={`text-base truncate ${node.type === 'collection' ? 'text-blue-900 font-medium' : 'text-gray-700 font-bold'}`}>
                            {node.name}
                        </span>
                        <span className="ml-auto text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full min-w-[24px] text-center">
                            {node.count || 0}
                        </span>
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div className="relative">
                        {/* Vertical line connecting children */}
                        <div
                            className="absolute left-0 top-0 bottom-3 border-l border-gray-300"
                            style={{ left: `${level * 16 + 18}px` }}
                        />
                        <div className="mt-0.5">
                            {node.children.map(child => (
                                <HierarchyNode key={child.id} node={child} level={level + 1} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex items-center justify-between mb-4 px-2">

                {hasAnyFilter && (
                    <button
                        onClick={onClearFilters}
                        className="text-xs text-red-600 hover:text-red-800 flex items-center transition-colors"
                    >
                        <X className="w-3 h-3 mr-1" />
                        Clear All
                    </button>
                )}
            </div>

            {/* Branch Section */}
            <CollapsibleSection id="branch" label="Location" icon={LayoutGrid}>
                <div className="space-y-1">
                    {dspaceHierarchy.length > 0 ? (
                        dspaceHierarchy.map(node => (
                            <HierarchyNode key={node.id} node={node} />
                        ))
                    ) : (
                        <div className="text-xs text-gray-400 p-2 text-center italic">
                            Loading...
                        </div>
                    )}
                </div>
            </CollapsibleSection>

            {/* Type Section */}
            <CollapsibleSection id="type" label="Type" icon={Database}>
                <div className="relative pl-2.5">
                    {/* Vertical line connecting types */}
                    <div className="absolute left-[18px] top-0 bottom-4 border-l border-gray-300" />

                    <div className="space-y-1">
                        {/* Cataloged Option */}
                        <div className="flex items-center justify-between py-1.5 px-3 rounded-sm hover:bg-blue-50 cursor-pointer group relative pl-8">
                            <div className="absolute border-t border-gray-300 w-3 left-[18px] top-[50%]" />
                            <div className="flex items-center flex-1">
                                <div className="w-4 h-4 mr-2 border-2 border-gray-300 rounded-sm group-hover:border-blue-500 transition-colors bg-white relative z-10"></div>
                                <span className="text-base text-gray-700">Cataloged</span>
                            </div>
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full min-w-[24px] text-center">
                                {filterOptions.source?.find(([k]) => k === 'Cataloged' || k === 'Koha Catalog' || k === 'Library Catalog')?.[1] || 0}
                            </span>
                        </div>

                        {/* Digital Option */}
                        <div className="flex items-center justify-between py-1.5 px-3 rounded-sm hover:bg-blue-50 cursor-pointer group relative pl-8">
                            <div className="absolute border-t border-gray-300 w-3 left-[18px] top-[50%]" />
                            <div className="flex items-center flex-1">
                                <div className="w-4 h-4 mr-2 border-2 border-gray-300 rounded-sm group-hover:border-blue-500 transition-colors bg-white relative z-10"></div>
                                <span className="text-base text-gray-700">Digital</span>
                            </div>
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full min-w-[24px] text-center">
                                {filterOptions.source?.find(([k]) => k === 'Digital' || k === 'Research Repository' || k === 'dspace')?.[1] || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </CollapsibleSection>

            {/* Other Metadata Optional Sections */}
            <CollapsibleSection id="year" label="Publication Year" icon={LayoutGrid}>
                <div className="max-h-48 overflow-y-auto custom-scrollbar relative pl-2.5">
                    {/* Vertical line connecting years */}
                    <div className="absolute left-[18px] top-0 bottom-4 border-l border-gray-300" />

                    <div className="space-y-1">
                        {filterOptions.year?.map(([year, count]) => (
                            <div key={year} className="flex items-center justify-between py-1.5 px-3 rounded-sm hover:bg-blue-50 cursor-pointer group text-base text-gray-600 relative pl-8">
                                <div className="absolute border-t border-gray-300 w-3 left-[18px] top-[50%]" />
                                <div className="flex items-center z-10 bg-white pr-2 rounded-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mr-2" />
                                    <span>{year}</span>
                                </div>
                                <span className="text-[10px] text-gray-400">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CollapsibleSection>

            {/* Language Section */}
            <CollapsibleSection id="language" label="Language" icon={Globe}>
                <div className="max-h-48 overflow-y-auto custom-scrollbar relative pl-2.5">
                    {/* Vertical line connecting languages */}
                    <div className="absolute left-[18px] top-0 bottom-4 border-l border-gray-300" />

                    <div className="space-y-1">
                        {filterOptions.language?.map(([lang, count]) => (
                            <div key={lang} className="flex items-center justify-between py-1.5 px-3 rounded-sm hover:bg-blue-50 cursor-pointer group text-base text-gray-600 relative pl-8">
                                <div className="absolute border-t border-gray-300 w-3 left-[18px] top-[50%]" />
                                <div className="flex items-center z-10 bg-white pr-2 rounded-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mr-2" />
                                    <span>{lang}</span>
                                </div>
                                <span className="text-[10px] text-gray-400">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CollapsibleSection>
        </div>
    );
};

export default MetadataTreeFilter;
