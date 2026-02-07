import React, { useState, useMemo } from 'react';
import { Filter, X, Plus, Minus, LayoutGrid, Calendar, Globe } from 'lucide-react';

const MetadataTreeFilter = ({
    resources = [],
    dspaceHierarchy = [],
    selectedFilters = {},
    onFilterChange,
    onClearFilters,
    onCollectionClick,
    className = ""
}) => {
    const [expandedSections, setExpandedSections] = useState({
        location: true,
        year: true,
        language: true
    });

    const [expandedNodes, setExpandedNodes] = useState({});

    const toggleSection = (id) => {
        setExpandedSections(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const toggleNode = (nodeId) => {
        setExpandedNodes(prev => ({
            ...prev,
            [nodeId]: !prev[nodeId]
        }));
    };

    const handleFilterToggle = (category, value) => {
        const currentSelected = selectedFilters[category] || [];
        const isRemoving = currentSelected.includes(value);

        // Use single-select for Year and Language as requested in terms of logic
        const newSelected = isRemoving ? [] : [value];

        onFilterChange({ [category]: newSelected });
    };

    const isSelected = (category, value) => {
        return (selectedFilters[category] || []).includes(value);
    };

    const filterOptions = useMemo(() => {
        const options = {
            year: {},
            language: {}
        };

        resources.forEach(resource => {
            if (resource.year) {
                options.year[resource.year] = (options.year[resource.year] || 0) + 1;
            }
            const lang = resource.language === 'en' || resource.language === 'English' ? 'English' :
                (resource.language === 'am' || resource.language === 'Amharic' ? 'Amharic' : resource.language || 'Unknown');
            options.language[lang] = (options.language[lang] || 0) + 1;
        });

        return {
            year: Object.entries(options.year).sort((a, b) => b[0].localeCompare(a[0])),
            language: Object.entries(options.language).sort((a, b) => b[0].localeCompare(a[0]))
        };
    }, [resources]);

    const hasAnyFilter = Object.keys(selectedFilters).some(k => (selectedFilters[k] || []).length > 0);

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
                    <div
                        className="mr-1 w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 bg-white relative z-10 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (hasChildren) toggleNode(nodeId);
                        }}
                    >
                        {hasChildren ? (
                            isExpanded ? <Minus className="w-2.5 h-2.5 text-gray-500" /> : <Plus className="w-2.5 h-2.5 text-gray-500" />
                        ) : (
                            <div className="w-1 h-1 rounded-full bg-gray-300 mx-auto" />
                        )}
                    </div>

                    <div
                        className="flex-1 flex items-center"
                        onClick={() => onCollectionClick(node)}
                    >
                        <span className={`text-[18px] font-bold truncate ${node.type === 'collection' ? 'text-blue-900' : 'text-gray-700'}`}>
                            {node.name}
                        </span>
                        <span className="ml-auto text-[15px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {node.count || 0}
                        </span>
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div className="relative">
                        <div
                            className="absolute left-0 top-0 bottom-3 border-l border-gray-300"
                            style={{ left: `${level * 16 + 15}px` }}
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

    const MainSection = ({ id, label, icon: Icon, children }) => {
        const isExpanded = expandedSections[id];
        return (
            <div className="mb-3 bg-white rounded border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => toggleSection(id)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                    <div className="flex items-center text-blue-900">
                        <Icon className="w-4 h-4 mr-2" />
                        <span className="text-xs font-black uppercase tracking-widest">{label}</span>
                    </div>
                    {isExpanded ? <Minus className="w-3 h-3 text-gray-400" /> : <Plus className="w-3 h-3 text-gray-400" />}
                </button>
                {isExpanded && <div className="p-2">{children}</div>}
            </div>
        );
    };

    const FlatFilterList = ({ category, options, icon: Icon, label }) => (
        <MainSection id={category} label={label} icon={Icon}>
            <div className="space-y-0.5 max-h-64 overflow-y-auto custom-scrollbar">
                {options.map(([val, count]) => {
                    const active = isSelected(category, val);
                    return (
                        <div
                            key={val}
                            onClick={() => handleFilterToggle(category, val)}
                            className={`flex items-center justify-between py-1 px-2 rounded-sm cursor-pointer transition-all ${active ? 'bg-blue-50 border-l-2 border-blue-600' : 'hover:bg-blue-50/50'}`}
                        >
                            <div className="flex items-center overflow-hidden">
                                <div className={`w-3 h-3 mr-2 border flex-shrink-0 flex items-center justify-center ${active ? 'bg-blue-600 border-blue-600 rounded-full' : 'bg-white border-gray-300 rounded-full'}`}>
                                    {active && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </div>
                                <span className={`text-[18px] truncate ${active ? 'text-blue-900 font-bold' : 'text-gray-600'}`}>{val}</span>
                            </div>
                            <span className="text-[15px] font-bold text-gray-400 ml-2">({count})</span>
                        </div>
                    );
                })}
                {options.length === 0 && (
                    <div className="text-[10px] text-gray-400 p-2 text-center italic">No options available</div>
                )}
            </div>
        </MainSection>
    );

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex items-center justify-between px-2 mb-2">
                
                {hasAnyFilter && (
                    <button onClick={onClearFilters} className="text-[10px] font-black text-red-600 hover:text-red-800 uppercase tracking-tighter flex items-center transition-colors">
                        <X className="w-3 h-3 mr-1" /> Clear
                    </button>
                )}
            </div>

            <MainSection id="location" label="Location" icon={LayoutGrid}>
                <div className="space-y-1 overflow-y-auto max-h-[400px] custom-scrollbar">
                    {dspaceHierarchy.length > 0 ? (
                        dspaceHierarchy.map(node => <HierarchyNode key={node.id || node.uuid} node={node} />)
                    ) : (
                        <div className="text-[10px] text-gray-400 p-2 text-center italic">Loading hierarchy...</div>
                    )}
                </div>
            </MainSection>

            <FlatFilterList category="year" options={filterOptions.year} icon={Calendar} label="Issued Date" />
            <FlatFilterList category="language" options={filterOptions.language} icon={Globe} label="Language" />
        </div>
    );
};

export default MetadataTreeFilter;
