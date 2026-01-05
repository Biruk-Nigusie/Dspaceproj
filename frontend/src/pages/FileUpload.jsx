import { useState } from 'react';
import { Upload, File, X, Search } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';

const FileUpload = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleFileSelect = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!formData.title || !file) {
      alert('Title and file are required');
      return;
    }

    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('title', formData.title);
    uploadFormData.append('description', formData.description);
    uploadFormData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/resources/upload-file/', {
        method: 'POST',
        body: uploadFormData,
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        alert('File uploaded successfully!');
        setFormData({ title: '', description: '' });
        setFile(null);
        fetchUploadedFiles();
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.error}`);
      }
    } catch (error) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/resources/uploaded-files/', {
        credentials: 'include'
      });
      if (response.ok) {
        const files = await response.json();
        setUploadedFiles(files);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleSearch = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/resources/search-files/?q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">File Upload & Management</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Form */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Upload File</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4A70A9]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4A70A9]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">File *</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-800">Choose file</span>
                </label>
                {file && (
                  <div className="mt-2 flex items-center justify-center">
                    <File className="w-4 h-4 mr-1" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                )}
              </div>
            </div>
            
            <Button type="submit" disabled={uploading} className="w-full">
              {uploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </form>
        </Card>

        {/* Search & Results */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Search Files</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4A70A9]"
            />
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {(searchResults.length > 0 ? searchResults : uploadedFiles).map(file => (
              <div key={file.id} className="p-3 border border-gray-200 rounded-lg">
                <h3 className="font-medium">{file.title}</h3>
                <p className="text-sm text-gray-600">{file.description}</p>
                <p className="text-xs text-gray-500">
                  Uploaded: {new Date(file.created_at).toLocaleDateString()}
                </p>
                {file.file_url && (
                  <a 
                    href={`http://localhost:8000${file.file_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Download
                  </a>
                )}
              </div>
            ))}
            {uploadedFiles.length === 0 && searchResults.length === 0 && (
              <p className="text-gray-500 text-center py-8">No files found</p>
            )}
          </div>
          
          <Button onClick={fetchUploadedFiles} variant="secondary" className="w-full mt-4">
            Refresh Files
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default FileUpload;