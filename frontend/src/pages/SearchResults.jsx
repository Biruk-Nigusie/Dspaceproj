import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Download, Eye } from 'lucide-react';
import axios from 'axios';
import Card from '../components/UI/Card';
import Badge from '../components/UI/Badge';
import Button from '../components/UI/Button';

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    source: '',
    type: '',
    year: '',
    sort: 'relevance'
  });

  const query = searchParams.get('q') || '';

  useEffect(() => {
    if (query) {
      searchResources();
    }
  }, [query, filters]);

  const searchResources = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      
      // Only add non-empty filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '' && key !== 'sort') {
          params.append(key, value);
        }
      });
      
      params.append('limit', '20');
      
      const response = await axios.get(`/api/resources/search/?${params}`);
      console.log('Search response:', response.data);
      setResults(response.data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDownload = async (resource) => {
    try {
      if (resource.source === 'local' && resource.id) {
        // For local files, use the download endpoint
        window.open(`/api/resources/${resource.id}/download/`, '_blank');
      } else if (resource.source === 'koha') {
        // Open Koha catalogue detail page
        window.open(`http://127.0.0.1:8085/cgi-bin/koha/catalogue/detail.pl?biblionumber=${resource.external_id}`, '_blank');
      } else if (resource.source === 'dspace') {
        // Open DSpace handle URL
        window.open(`http://localhost:4000/handle/${resource.external_id}`, '_blank');
      } else if (resource.source === 'vufind') {
        // Open VuFind record page
        window.open(`http://localhost:8090/Record/${resource.external_id}`, '_blank');
      } else {
        // Fallback to resource URL
        window.open(resource.url, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handlePreview = async (resource) => {
    try {
      if (resource.source === 'local' && resource.id) {
        window.open(`/api/resources/${resource.id}/preview/`, '_blank');
      } else if (resource.source === 'koha') {
        // Open Koha catalogue detail page
        window.open(`http://127.0.0.1:8085/cgi-bin/koha/catalogue/detail.pl?biblionumber=${resource.external_id}`, '_blank');
      } else if (resource.source === 'dspace') {
        // Open DSpace item page
        window.open(`http://localhost:4000/handle/${resource.external_id}`, '_blank');
      } else if (resource.source === 'vufind') {
        // Open VuFind record page
        window.open(`http://localhost:8090/Record/${resource.external_id}`, '_blank');
      } else {
        window.open(resource.url, '_blank');
      }
    } catch (error) {
      console.error('Preview error:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setSearchParams({ q: e.target.value })}
              placeholder="Search resources..."
              className="w-full pl-10 pr-4 py-3 border border-[#8FABD4] rounded-lg focus:outline-none focus:border-[#4A70A9]"
            />
          </div>
          <Button onClick={searchResources}>Search</Button>
        </div>
        <p className="text-gray-600">
          {results.length} results for "{query}"
        </p>
      </div>

      <div className="flex gap-8">
        {/* Filters Sidebar */}
        <div className="w-64 shrink-0">
          <Card>
            <h3 className="font-semibold mb-4 flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Source</label>
                <select
                  value={filters.source}
                  onChange={(e) => handleFilterChange('source', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="">All Sources</option>
                  <option value="koha">Koha (Library)</option>
                  <option value="dspace">DSpace (Repository)</option>
                  <option value="vufind">VuFind (Discovery)</option>
                  <option value="local">Local (Uploads)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="">All Types</option>
                  <option value="book">Book</option>
                  <option value="document">Document</option>
                  <option value="research">Research</option>
                  <option value="report">Report</option>
                  <option value="presentation">Presentation</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <input
                  type="number"
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  placeholder="e.g. 2023"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Sort by</label>
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="relevance">Relevance</option>
                  <option value="date">Date</option>
                  <option value="popularity">Popularity</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* Results */}
        <div className="flex-1">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="space-y-4">
              {results.map((resource, index) => (
                <Card key={resource.id || resource.external_id || `result-${index}`} className="hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{resource.title}</h3>
                      {resource.authors && (
                        <p className="text-gray-600 mb-2">by {resource.authors}</p>
                      )}
                      {resource.description && (
                        <p className="text-gray-700 mb-3 line-clamp-3">{resource.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 mb-3">
                        <Badge variant={resource.source}>
                          {resource.source_name || resource.source?.toUpperCase()}
                        </Badge>
                        <Badge variant={resource.resource_type}>{resource.resource_type}</Badge>
                        {resource.year && <span className="text-sm text-gray-500">{resource.year}</span>}
                        {resource.availability && (
                          <span className="text-sm text-green-600">{resource.availability}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <Button
                          size="sm"
                          onClick={() => handlePreview(resource)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Open in {resource.source === 'koha' ? 'Koha' : resource.source === 'dspace' ? 'DSpace' : resource.source === 'vufind' ? 'VuFind' : 'System'}
                        </Button>
                        {resource.source !== 'local' && (
                          <span className="text-sm text-gray-500">
                            ID: {resource.external_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              
              {results.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No results found for "{query}"</p>
                  <p className="text-gray-400 mt-2">Try adjusting your search terms or filters</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResults;