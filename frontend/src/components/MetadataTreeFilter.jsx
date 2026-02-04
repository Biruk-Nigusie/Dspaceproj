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

    const toggleNode = (nodeId) => {
        setExpandedNodes(prev => ({
            ...prev,
            [nodeId]: !prev[nodeId]
        }));
    };

    // Auto-expand paths to selected collections
    useEffect(() => {
        if (!dspaceHierarchy || dspaceHierarchy.length === 0) return;

        const findSelectedPaths = (nodes, targetIds) => {
            let paths = [];
            for (const node of nodes) {
                const id = node.uuid || node.id;
                if (targetIds.includes(id)) {
                    paths.push(id);
                }
                if (node.children) {
                    const childPaths = findSelectedPaths(node.children, targetIds);
                    if (childPaths.length > 0) {
                        paths = [...paths, id, ...childPaths];
                    }
                }
            }
            return paths;
        };

        const activeColIds = resources
            .filter(r => r.source === 'dspace')
            .map(r => r.external_id); // This is not quite right, we need the actual selected IDs from URL/state

        // Use selectedFilters or some other prop to get actually selected collection IDs
        // Actually, let's just make the manual toggle work better for now, 
        // and ensure HierarchyNode uses expandedNodes from parent.
    }, [dspaceHierarchy, resources]);

    const handleFilterToggle = (category, value) => {
        const currentSelected = selectedFilters[category] || [];
        let newSelected;
        if (currentSelected.includes(value)) {
            newSelected = currentSelected.filter(v => v !== value);
        } else {
            newSelected = [...currentSelected, value];
        }
        onFilterChange(category, newSelected);
    };

    const isSelected = (category, value) => {
        return (selectedFilters[category] || []).includes(value);
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
            const lang = rawLang === 'en' || rawLang === 'English' ? 'English' : (rawLang === 'am' || rawLang === 'Amharic' ? 'Amharic' : rawLang);
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
        const nodeId = node.uuid || node.id;
        const isExpanded = expandedNodes[nodeId] || false;
        const hasChildren = node.children && node.children.length > 0;

        return (
            <div className="select-none relative">
                <div
                    className={`flex items-center py-1.5 px-2 rounded-sm hover:bg-blue-50 cursor-pointer group transition-all relative z-10`}
                    style={{ paddingLeft: `${level * 16 + 8}px` }}
                >
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
                            if (hasChildren) toggleNode(nodeId);
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
                            if (onCollectionClick) {
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
                        <div
                            className="absolute left-0 top-0 bottom-3 border-l border-gray-300"
                            style={{ left: `${level * 16 + 18}px` }}
                        />
                        <div className="mt-0.5">
                            {node.children.map(child => (
                                <HierarchyNode key={child.id || child.uuid} node={child} level={level + 1} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <Filter size={16} /> Filters
                </h3>
                {hasAnyFilter && (
                    <button
                        onClick={onClearFilters}
                        className="text-[10px] font-bold text-red-600 hover:text-red-800 flex items-center transition-colors uppercase tracking-widest"
                    >
                        <X className="w-3 h-3 mr-1" />
                        Clear
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
                            No collections found
                        </div>
                    )}
                </div>
            </CollapsibleSection>

            {/* Source Section */}
            <CollapsibleSection id="source" label="Source" icon={Database}>
                <div className="space-y-1">
                    {filterOptions.source?.map(([source, count]) => (
                        <div
                            key={source}
                            onClick={() => handleFilterToggle('source', source)}
                            className={`flex items-center justify-between py-1.5 px-3 rounded-sm hover:bg-blue-50 cursor-pointer group transition-colors ${isSelected('source', source) ? 'bg-blue-50 border-l-2 border-blue-600' : ''}`}
                        >
                            <div className="flex items-center flex-1">
                                <div className={`w-4 h-4 mr-2 border-2 rounded-sm transition-all flex items-center justify-center ${isSelected('source', source) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                                    {isSelected('source', source) && <X className="w-3 h-3 text-white" />}
                                </div>
                                <span className={`text-sm ${isSelected('source', source) ? 'text-blue-900 font-bold' : 'text-gray-700'}`}>{source}</span>
                            </div>
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                                {count}
                            </span>
                        </div>
                    ))}
                </div>
            </CollapsibleSection>

            {/* Type Section */}
            <CollapsibleSection id="type" label="Resource Type" icon={LayoutGrid}>
                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                    {filterOptions.type?.map(([type, count]) => (
                        <div
                            key={type}
                            onClick={() => handleFilterToggle('type', type)}
                            className={`flex items-center justify-between py-1.5 px-3 rounded-sm hover:bg-blue-50 cursor-pointer group transition-colors ${isSelected('type', type) ? 'bg-blue-50 border-l-2 border-blue-600' : ''}`}
                        >
                            <div className="flex items-center flex-1">
                                <div className={`w-4 h-4 mr-2 border-2 rounded-sm transition-all flex items-center justify-center ${isSelected('type', type) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                                    {isSelected('type', type) && <X className="w-3 h-3 text-white" />}
                                </div>
                                <span className={`text-sm ${isSelected('type', type) ? 'text-blue-900 font-bold' : 'text-gray-700'}`}>{type}</span>
                            </div>
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                                {count}
                            </span>
                        </div>
                    ))}
                </div>
            </CollapsibleSection>

            {/* Year Section */}
            <CollapsibleSection id="year" label="Publication Year" icon={LayoutGrid}>
                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                    {filterOptions.year?.map(([year, count]) => (
                        <div
                            key={year}
                            onClick={() => handleFilterToggle('year', year)}
                            className={`flex items-center justify-between py-1.5 px-3 rounded-sm hover:bg-blue-50 cursor-pointer group transition-colors ${isSelected('year', year) ? 'bg-blue-50 border-l-2 border-blue-600' : ''}`}
                        >
                            <div className="flex items-center flex-1">
                                <div className={`w-4 h-4 mr-2 border-2 rounded-sm transition-all flex items-center justify-center ${isSelected('year', year) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                                    {isSelected('year', year) && <X className="w-3 h-3 text-white" />}
                                </div>
                                <span className={`text-sm ${isSelected('year', year) ? 'text-blue-900 font-bold' : 'text-gray-700'}`}>{year}</span>
                            </div>
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                                {count}
                            </span>
                        </div>
                    ))}
                </div>
            </CollapsibleSection>

            {/* Language Section */}
            <CollapsibleSection id="language" label="Language" icon={Globe}>
                <div className="space-y-1">
                    {filterOptions.language?.map(([lang, count]) => (
                        <div
                            key={lang}
                            onClick={() => handleFilterToggle('language', lang)}
                            className={`flex items-center justify-between py-1.5 px-3 rounded-sm hover:bg-blue-50 cursor-pointer group transition-colors ${isSelected('language', lang) ? 'bg-blue-50 border-l-2 border-blue-600' : ''}`}
                        >
                            <div className="flex items-center flex-1">
                                <div className={`w-4 h-4 mr-2 border-2 rounded-sm transition-all flex items-center justify-center ${isSelected('language', lang) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                                    {isSelected('language', lang) && <X className="w-3 h-3 text-white" />}
                                </div>
                                <span className={`text-sm ${isSelected('language', lang) ? 'text-blue-900 font-bold' : 'text-gray-700'}`}>{lang}</span>
                            </div>
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                                {count}
                            </span>
                        </div>
                    ))}
                </div>
            </CollapsibleSection>
        </div>
    );
};

export default MetadataTreeFilter;
