import { useState, useEffect } from 'react';
import { Upload, File, X, Search, LogIn, Eye, EyeOff } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import dspaceService from '../services/dspaceService';

const IntegratedUpload = () => {
  const [dspaceAuth, setDspaceAuth] = useState(false);
  const [loginData, setLoginData] = useState({ 
    user: 'dspacedemo+admin@gmail.com', 
    password: 'dspace' 
  });
  const [showPassword, setShowPassword] = useState(false);
  const [collections, setCollections] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    description: '',
    collectionId: ''
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dspaceItems, setDspaceItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkDSpaceAuth();
  }, []);

  const checkDSpaceAuth = async () => {
    const authStatus = await dspaceService.checkAuthStatus();
    if (authStatus.authenticated) {
      setDspaceAuth(true);
      await fetchCollections();
      await fetchDSpaceItems();
    }
  };

  const handleDSpaceLogin = async (e) => {
    e.preventDefault();
    try {
      await dspaceService.login(loginData.user, loginData.password);
      setDspaceAuth(true);
      await fetchCollections();
      await fetchDSpaceItems();
    } catch (error) {
      alert(`DSpace login failed: ${error.message}`);
    }
  };

  const fetchCollections = async () => {
    const cols = await dspaceService.getCollections();
    setCollections(cols);
    if (cols.length > 0) {
      setFormData(prev => ({ ...prev, collectionId: cols[0].id }));
    }
  };

  const fetchDSpaceItems = async () => {
    const items = await dspaceService.getWorkspaceItems();
    setDspaceItems(items);
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

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleFileSelect = (e) => {
    setFile(e.target.files[0]);
  };

  const handleIntegratedUpload = async (e) => {
    e.preventDefault();
    if (!formData.title || !file) {
      alert('Title and file are required');
      return;
    }

    setUploading(true);
    
    try {
      // 1. Upload to Django backend
      const djangoFormData = new FormData();
      djangoFormData.append('title', formData.title);
      djangoFormData.append('description', formData.description);
      djangoFormData.append('file', file);

      const djangoResponse = await fetch('http://localhost:8000/api/resources/upload-file/', {
        method: 'POST',
        body: djangoFormData,
        credentials: 'include'
      });

      let djangoSuccess = false;
      if (djangoResponse.ok) {
        djangoSuccess = true;
        console.log('✅ Django upload successful');
      }

      // 2. Upload to DSpace if authenticated
      let dspaceSuccess = false;
      if (dspaceAuth && formData.collectionId) {
        try {
          const workspaceItem = await dspaceService.createWorkspaceItem(formData.collectionId);
          await dspaceService.updateMetadata(workspaceItem.id, formData);
          await dspaceService.uploadFile(workspaceItem.id, file);
          dspaceSuccess = true;
          console.log('✅ DSpace upload successful');
          await fetchDSpaceItems();
        } catch (error) {
          console.error('DSpace upload failed:', error);
        }
      }

      // Show results
      if (djangoSuccess && dspaceSuccess) {
        alert('File uploaded successfully to both Django and DSpace!');
      } else if (djangoSuccess) {
        alert('File uploaded to Django backend successfully!');
      } else if (dspaceSuccess) {
        alert('File uploaded to DSpace successfully!');
      } else {
        alert('Upload failed');
      }

      // Reset form
      setFormData({ title: '', authors: '', description: '', collectionId: formData.collectionId });
      setFile(null);
      await fetchUploadedFiles();

    } catch (error) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/resources/search-files/?q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const results = await response.json();
        setUploadedFiles(results);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  if (!dspaceAuth) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* DSpace Login */}
          <Card>
            <div className="text-center mb-6">
              <LogIn className="w-16 h-16 mx-auto mb-4 text-[#4A70A9]" />
              <h2 className="text-2xl font-bold">DSpace Integration</h2>
              <p className="text-gray-600">Login to enable DSpace uploads</p>
            </div>
            
            <form onSubmit={handleDSpaceLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={loginData.user}
                  onChange={(e) => setLoginData(prev => ({ ...prev, user: e.target.value }))}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4A70A9]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginData.password}
                    onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4A70A9]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                  </button>
                </div>
              </div>
              
              <Button type="submit" className="w-full">
                Connect to DSpace
              </Button>
            </form>
          </Card>

          {/* Local Upload Only */}
          {/* <Card>
            <h2 className="text-xl font-semibold mb-4">Local Upload Only</h2>
            <p className="text-gray-600 mb-4">Upload files to Django backend without DSpace integration</p>
            <Button 
              onClick={() => setDspaceAuth(true)} 
              variant="secondary" 
              className="w-full"
            >
              Skip DSpace Integration
            </Button>
          </Card> */}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Integrated File Upload</h1>
        <Button variant="secondary" onClick={() => {
          dspaceService.logout();
          setDspaceAuth(false);
        }}>
          Disconnect DSpace
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Form */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Upload File</h2>
          <form onSubmit={handleIntegratedUpload} className="space-y-4">
            {collections.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">DSpace Collection</label>
                <select
                  name="collectionId"
                  value={formData.collectionId}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4A70A9]"
                >
                  <option value="">Select Collection (Optional)</option>
                  {collections.map(collection => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
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
              <label className="block text-sm font-medium mb-2">Authors</label>
              <input
                type="text"
                name="authors"
                value={formData.authors}
                onChange={handleInputChange}
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
              {uploading ? 'Uploading...' : 'Upload to Both Systems'}
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
            <h3 className="font-semibold text-sm text-gray-700">Django Files</h3>
            {uploadedFiles.map(file => (
              <div key={`django-${file.id}`} className="p-3 border border-gray-200 rounded-lg">
                <h4 className="font-medium">{file.title}</h4>
                <p className="text-sm text-gray-600">{file.description}</p>
                <p className="text-xs text-gray-500">Django • {new Date(file.created_at).toLocaleDateString()}</p>
              </div>
            ))}
            
            <h3 className="font-semibold text-sm text-gray-700 mt-4">DSpace Items</h3>
            {dspaceItems.map(item => (
              <div key={`dspace-${item.id}`} className="p-3 border border-blue-200 rounded-lg">
                <h4 className="font-medium">{item.sections?.traditionalpageone?.['dc.title']?.[0]?.value || 'Untitled'}</h4>
                <p className="text-xs text-gray-500">DSpace • ID: {item.id}</p>
              </div>
            ))}
            
            {uploadedFiles.length === 0 && dspaceItems.length === 0 && (
              <p className="text-gray-500 text-center py-8">No files found</p>
            )}
          </div>
          
          <Button onClick={() => {
            fetchUploadedFiles();
            fetchDSpaceItems();
          }} variant="secondary" className="w-full mt-4">
            Refresh Files
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default IntegratedUpload;