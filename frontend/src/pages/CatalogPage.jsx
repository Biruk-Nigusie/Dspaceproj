import { useState, useEffect } from "react";
import CatalogTable from "../components/CatalogTable";
import { BookOpen, Database, Search, TrendingUp } from "lucide-react";

const CatalogPage = () => {
    const [stats, setStats] = useState({
        totalItems: 0,
        kohaItems: 0,
        dspaceItems: 0,
        collections: 0
    });
    
    useEffect(() => {
        loadStats();
    }, []);
    
    const loadStats = async () => {
        try {
            const response = await fetch('/api/resources/catalog/collections/');
            if (response.ok) {
                const data = await response.json();
                setStats({
                    totalItems: 0, // Will be updated by the table component
                    kohaItems: data.collections?.koha?.length || 0,
                    dspaceItems: data.collections?.dspace?.length || 0,
                    collections: (data.collections?.dspace?.length || 0) + (data.collections?.koha?.length || 0)
                });
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <BookOpen className="text-blue-600" size={32} />
                                Library Catalog
                            </h1>
                            <p className="mt-2 text-gray-600">
                                Search and browse items from our integrated library systems
                            </p>
                        </div>
                        
                        {/* Stats Cards */}
                        <div className="hidden md:flex gap-4">
                            <div className="bg-blue-50 rounded-lg p-4 text-center min-w-[100px]">
                                <div className="text-2xl font-bold text-blue-600">{stats.kohaItems}</div>
                                <div className="text-xs text-blue-600 font-medium">Koha Items</div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 text-center min-w-[100px]">
                                <div className="text-2xl font-bold text-green-600">{stats.dspaceItems}</div>
                                <div className="text-xs text-green-600 font-medium">DSpace Items</div>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4 text-center min-w-[100px]">
                                <div className="text-2xl font-bold text-purple-600">{stats.collections}</div>
                                <div className="text-xs text-purple-600 font-medium">Collections</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Features Banner */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 mb-8 text-white">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-center gap-3">
                            <Search className="bg-white/20 rounded-lg p-2" size={40} />
                            <div>
                                <h3 className="font-semibold">Advanced Search</h3>
                                <p className="text-sm opacity-90">Search across multiple systems</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Database className="bg-white/20 rounded-lg p-2" size={40} />
                            <div>
                                <h3 className="font-semibold">Dynamic Columns</h3>
                                <p className="text-sm opacity-90">Adapts to collection types</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <TrendingUp className="bg-white/20 rounded-lg p-2" size={40} />
                            <div>
                                <h3 className="font-semibold">Real-time Data</h3>
                                <p className="text-sm opacity-90">Live catalog integration</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Catalog Table */}
                <CatalogTable />
            </div>
        </div>
    );
};

export default CatalogPage;