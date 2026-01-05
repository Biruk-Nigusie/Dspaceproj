import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Eye, Heart, Share2 } from 'lucide-react';
import axios from 'axios';
import Card from '../components/UI/Card';
import Badge from '../components/UI/Badge';
import Button from '../components/UI/Button';

const ResourceDetails = () => {
  const { id } = useParams();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchResource();
  }, [id]);

  const fetchResource = async () => {
    try {
      const response = await axios.get(`/api/resources/${id}/`);
      setResource(response.data);
    } catch (error) {
      console.error('Error fetching resource:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await axios.post(`/api/resources/${id}/download/`);
      if (response.data.download_url) {
        window.open(response.data.download_url, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">Loading resource details...</div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Resource Not Found</h2>
          <p>The requested resource could not be found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Header */}
          <Card className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{resource.title}</h1>
                {resource.authors && (
                  <p className="text-lg text-gray-600 mb-2">by {resource.authors}</p>
                )}
                <div className="flex items-center space-x-4 mb-4">
                  <Badge variant={resource.source}>{resource.source?.toUpperCase()}</Badge>
                  <Badge variant={resource.resource_type}>{resource.resource_type}</Badge>
                  {resource.year && <span className="text-gray-600">{resource.year}</span>}
                  {resource.publisher && <span className="text-gray-600">{resource.publisher}</span>}
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="secondary">
                <Heart className="w-4 h-4 mr-2" />
                Add to Favorites
              </Button>
              <Button variant="secondary">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </Card>

          {/* Tabs */}
          <Card>
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                {['overview', 'metadata'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab
                        ? 'border-[#4A70A9] text-[#4A70A9]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Description</h3>
                <p className="text-gray-700 leading-relaxed mb-6">
                  {resource.description || 'No description available.'}
                </p>
                
                {resource.thumbnail_url && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Preview</h3>
                    <img
                      src={resource.thumbnail_url}
                      alt={resource.title}
                      className="max-w-xs rounded-lg shadow-md"
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'metadata' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Metadata</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <p className="text-gray-900">{resource.title}</p>
                  </div>
                  {resource.authors && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Authors</label>
                      <p className="text-gray-900">{resource.authors}</p>
                    </div>
                  )}
                  {resource.publisher && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Publisher</label>
                      <p className="text-gray-900">{resource.publisher}</p>
                    </div>
                  )}
                  {resource.year && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                      <p className="text-gray-900">{resource.year}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                    <p className="text-gray-900">{resource.source?.toUpperCase()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <p className="text-gray-900">{resource.resource_type}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <h3 className="font-semibold mb-4">Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Downloads</span>
                <span className="font-medium">{resource.download_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Views</span>
                <span className="font-medium">{resource.view_count || 0}</span>
              </div>
              {resource.file_size && (
                <div className="flex justify-between">
                  <span className="text-gray-600">File Size</span>
                  <span className="font-medium">
                    {(resource.file_size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <h3 className="font-semibold mb-4">Actions</h3>
            <div className="space-y-3">
              {resource.view_url && (
                <Button variant="secondary" className="w-full">
                  <Eye className="w-4 h-4 mr-2" />
                  View Online
                </Button>
              )}
              <Button onClick={handleDownload} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Resource
              </Button>
            </div>
          </Card>

          {/* Related Items */}
          <Card>
            <h3 className="font-semibold mb-4">Related Resources</h3>
            <div className="text-gray-600 text-sm">
              Related resources will be shown here based on tags, categories, or similar content.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResourceDetails;