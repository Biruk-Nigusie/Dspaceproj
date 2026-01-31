import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, User, LogOut, X, Loader2, Book } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import dspaceService from "../../services/dspaceService";
import { useAuth } from "../../contexts/AuthContext";

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [collections, setCollections] = useState([]);
    const searchRef = useRef(null);
    const collectionsRef = useRef(null);

    const params = new URLSearchParams(location.search);
    const activeCollectionIds = params.get('collections')?.split(',').filter(x => x) || [];

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    useEffect(() => {
        const fetchCollections = async () => {
            try {
                const list = await dspaceService.getCollections();
                setCollections(list || []);
            } catch (error) {
                console.error("Error fetching collections:", error);
            }
        };
        fetchCollections();
    }, []);

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

    const clearCollectionFilter = () => {
        const currentParams = new URLSearchParams(location.search);
        currentParams.delete('collections');
        navigate(`/?${currentParams.toString()}`);
    };

    useEffect(() => {
        const handleTriggerSearch = () => setIsSearchOpen(true);
        window.addEventListener('trigger-search', handleTriggerSearch);

        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchOpen(false);
            }
        };

        if (isSearchOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.body.style.overflow = "hidden";
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
            document.body.style.overflow = "unset";
        }

        return () => {
            window.removeEventListener('trigger-search', handleTriggerSearch);
            document.removeEventListener("mousedown", handleClickOutside);
            document.body.style.overflow = "unset";
        };
    }, [isSearchOpen]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.trim().length > 2) {
                setIsSearching(true);
                try {
                    const results = await dspaceService.searchItems(searchQuery);
                    const mappedResults = results
                        .filter(item => item._embedded?.indexableObject?.type === 'item')
                        .map(item => {
                            const metadata = item._embedded?.indexableObject?.metadata || {};
                            const getVal = (key) => metadata[key]?.[0]?.value || "";
                            return {
                                id: item._embedded?.indexableObject?.uuid,
                                title: getVal("dc.title") || item._embedded?.indexableObject?.name,
                                authors: metadata["dc.contributor.author"]?.map(m => m.value).join(", ") || "",
                                handle: item._embedded?.indexableObject?.handle,
                                type: getVal("dc.type")
                            };
                        });
                    setSearchResults(mappedResults);
                } catch (error) {
                    console.error("Search error:", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleResultClick = (result) => {
        setIsSearchOpen(false);
        setSearchQuery("");
        // Assuming there's a way to view item, maybe navigate to home with scroll or search state
        // For now, let's just log or navigate if there's a detail page
        // navigate(`/item/${result.id}`); 
        // If we want to trigger search on home page:
        navigate(`/?q=${encodeURIComponent(result.title)}`);
    };

    return (
        <nav className="bg-white text-gray-900 shadow-md sticky top-0 z-50">
            <div className="w-full px-4">
                <div className="flex justify-between items-center h-20">
                    {/* Logo - Pushed Left */}
                    <div className="flex items-center flex-shrink-0 mr-6">
                        <Link to="/" className="flex items-center space-x-3 group">
                            <img
                                src="/images/womezeker.png"
                                alt="ወመዘክር Logo"
                                className="h-16 w-auto object-contain transition-transform group-hover:scale-105"
                            />
                            <div className="hidden lg:block">
                                <span className="text-xl font-black text-blue-900 leading-tight">ወመዘክር</span>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">EANLA SERVICE</p>
                            </div>
                        </Link>
                    </div>

                    {/* Collections - Centered and visible */}
                    <div className="flex-1 min-w-0 border-l border-gray-100 pl-6">
                        <div className="flex items-center h-20 overflow-x-auto no-scrollbar space-x-8 whitespace-nowrap py-2">
                            <button
                                onClick={clearCollectionFilter}
                                className={`text-sm font-bold transition-colors cursor-pointer pb-1 flex-shrink-0 ${activeCollectionIds.length === 0 ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-blue-600"}`}
                            >
                                All Records
                            </button>
                            {collections.map((collection) => {
                                const id = collection.uuid || collection.id;
                                const isActive = activeCollectionIds.includes(id);
                                return (
                                    <button
                                        key={id}
                                        onClick={() => handleCollectionClick(collection)}
                                        className={`text-sm font-bold transition-colors cursor-pointer pb-1 flex-shrink-0 ${isActive ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-blue-600"}`}
                                    >
                                        {collection.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Search and User Actions */}
                    <div className="flex items-center space-x-6 ml-4 flex-shrink-0">
                        {/* Inline Search Input */}
                        <div className="relative hidden xl:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={searchQuery}
                                onFocus={() => setIsSearchOpen(true)}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search collection..."
                                className="bg-gray-200 hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-900 border border-gray-200 rounded-lg py-2 pl-10 pr-4 text-sm outline-none transition-all w-60 placeholder:text-gray-400"
                            />
                        </div>

                        {/* Mobile/Smaller screen search icon */}
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="xl:hidden p-2 hover:bg-gray-50 rounded-full transition-colors"
                        >
                            <Search className="w-5 h-5 text-gray-600" />
                        </button>

                        <div className="hidden lg:flex items-center space-x-4">
                            {user && (
                                <Link to="/editor" className="bg-blue-600 hover:bg-blue-900 text-white px-4 py-2 rounded-sm text-xs font-bold transition-all shadow-sm">
                                    UPLOAD
                                </Link>
                            )}
                            {user?.role === "admin" && (
                                <Link to="/admin-choice" className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm">
                                    ADMIN
                                </Link>
                            )}
                        </div>

                        {user ? (
                            <div className="flex items-center space-x-3 border-l border-gray-100 pl-6">
                                <Link to="/profile" className="flex items-center space-x-2 group">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-sm font-bold border border-blue-100 text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        {user.first_name?.[0] || user.username?.[0]?.toUpperCase()}
                                    </div>
                                    <span className="hidden md:inline text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">
                                        {user.first_name || user.username}
                                    </span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                    title="Logout"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <Link
                                to="/signin"
                                className="bg-blue-900 text-white px-8 py-1.5 rounded-sm font-bold transition-all shadow-md active:scale-95"
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Search Overlay/Modal */}
            {isSearchOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-md transition-all duration-300">
                    <div
                        ref={searchRef}
                        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
                    >
                        <div className="relative p-6 border-b border-gray-100 flex items-center">
                            <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-blue-500 w-6 h-6 focus-within:animate-pulse" />
                            <input
                                autoFocus
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search archives, books, manuscripts..."
                                className="w-full pl-14 pr-12 py-4 bg-gray-50 rounded-xl text-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent focus:border-blue-500 placeholder:text-gray-400"
                            />
                            <button
                                onClick={() => setIsSearchOpen(false)}
                                className="ml-4 p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer group"
                            >
                                <X className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                            {isSearching ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
                                    <p>Searching through archives...</p>
                                </div>
                            ) : searchQuery.trim().length > 0 ? (
                                searchResults.length > 0 ? (
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-3">
                                            Search Results ({searchResults.length})
                                        </h3>
                                        {searchResults.map((result) => (
                                            <div
                                                key={result.id}
                                                onClick={() => handleResultClick(result)}
                                                className="flex items-start p-4 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-blue-100 group"
                                            >
                                                <div className="bg-blue-100 p-2 rounded-lg mr-4 group-hover:bg-blue-200 transition-colors">
                                                    <Book className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-900 truncate">
                                                        {result.title}
                                                    </h4>
                                                    <p className="text-sm text-gray-500 truncate mt-0.5">
                                                        {result.authors}
                                                    </p>
                                                    <div className="flex items-center mt-2 space-x-3">
                                                        {result.type && (
                                                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium uppercase">
                                                                {result.type}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] text-blue-600 font-medium">
                                                            Handle: {result.handle || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : searchQuery.trim().length > 2 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <p className="text-lg">No results found for "{searchQuery}"</p>
                                        <p className="text-sm mt-1">Try different keywords or check spelling</p>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-400">
                                        <p>Type at least 3 characters to search</p>
                                    </div>
                                )
                            ) : (
                                <div className="text-center py-12 text-gray-400">
                                    <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>Quick Access Search</p>
                                    <p className="text-xs mt-1">Search through millions of digital and physical records</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
