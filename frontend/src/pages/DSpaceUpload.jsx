import { useState, useEffect } from 'react';
import { Upload, File, X, LogIn, Eye, EyeOff } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';

const DSpaceUpload = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ 
    user: 'dspacedemo+admin@gmail.com', 
    password: 'dspace' 
  });
  const [showPassword, setShowPassword] = useState(false);
  const [collections, setCollections] = useState([]);
  const [uploadedItems, setUploadedItems] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    description: '',
    subject: '',
    type: 'document',
    language: 'en',
    collectionId: ''
  });
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('http://localhost:8080/server/api/authn/status', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setIsLoggedIn(true);
          await fetchCollections();
          await fetchUploadedItems();
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // DSpace Angular pattern: POST with form data
      const body = `password=${encodeURIComponent(loginData.password)}&email=${encodeURIComponent(loginData.user)}`;
      
      const loginResponse = await fetch('http://localhost:8080/server/api/authn/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: body,
        credentials: 'include'
      });
      
      if (loginResponse.ok) {
        const authStatus = await loginResponse.json();
        if (authStatus.authenticated) {
          setIsLoggedIn(true);
          await fetchCollections();
          await fetchUploadedItems();
        } else {
          throw new Error('Authentication failed');
        }
      } else {
        const errorText = await loginResponse.text();
        throw new Error(`Login failed: ${loginResponse.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const response = await fetch('http://localhost:8080/server/api/core/collections', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const collections = data._embedded?.collections || [];
        setCollections(collections);
        if (collections.length > 0) {
          setFormData(prev => ({ ...prev, collectionId: collections[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const fetchUploadedItems = async () => {
    try {
      const response = await fetch('http://localhost:8080/server/api/submission/workspaceitems?size=10', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const items = data._embedded?.workspaceitems || [];
        setUploadedItems(items);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8080/server/api/authn/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggedIn(false);
      setUploadedItems([]);
      setCollections([]);
    }
  };

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.collectionId) {
      alert('Please select a collection');
      return;
    }
    
    setUploading(true);
    
    try {
      // Step 1: Create workspace item (DSpace Angular pattern)
      const createResponse = await fetch('http://localhost:8080/server/api/submission/workspaceitems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          collection: `http://localhost:8080/server/api/core/collections/${formData.collectionId}`
        })
      });
      
      if (!createResponse.ok) {
        throw new Error(`Failed to create workspace item: ${createResponse.status}`);
      }
      
      const workspaceItem = await createResponse.json();
      const workspaceItemId = workspaceItem.id;
      
      // Step 2: Update metadata
      const metadataUpdates = [];
      if (formData.title) {
        metadataUpdates.push({
          op: 'add',
          path: '/sections/traditionalpageone/dc.title/0',
          value: { value: formData.title }
        });
      }
      if (formData.authors) {
        metadataUpdates.push({
          op: 'add',
          path: '/sections/traditionalpageone/dc.contributor.author/0',
          value: { value: formData.authors }
        });
      }
      if (formData.description) {
        metadataUpdates.push({
          op: 'add',
          path: '/sections/traditionalpageone/dc.description.abstract/0',
          value: { value: formData.description }
        });
      }
      if (formData.subject) {
        metadataUpdates.push({
          op: 'add',
          path: '/sections/traditionalpageone/dc.subject/0',
          value: { value: formData.subject }
        });
      }
      
      if (metadataUpdates.length > 0) {
        const patchResponse = await fetch(`http://localhost:8080/server/api/submission/workspaceitems/${workspaceItemId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(metadataUpdates)
        });
        
        if (!patchResponse.ok) {
          console.warn('Metadata update failed:', patchResponse.status);
        }
      }
      
      // Step 3: Upload files if any
      if (files.length > 0) {
        for (const file of files) {
          const fileFormData = new FormData();
          fileFormData.append('file', file);
          
          const uploadResponse = await fetch(`http://localhost:8080/server/api/submission/workspaceitems/${workspaceItemId}/sections/upload`, {
            method: 'POST',
            credentials: 'include',
            body: fileFormData
          });
          
          if (!uploadResponse.ok) {
            console.warn(`File upload failed for ${file.name}:`, uploadResponse.status);
          }
        }
      }
      
      alert('Upload successful!');
      
      // Reset form
      setFormData({
        title: '',
        authors: '',
        description: '',
        subject: '',
        type: 'document',
        language: 'en',
        collectionId: formData.collectionId
      });
      setFiles([]);
      
      // Refresh uploaded items
      await fetchUploadedItems();
      
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <Card>
          <div className="text-center mb-6">
            <LogIn className="w-16 h-16 mx-auto mb-4 text-[#4A70A9]" />
            <h2 className="text-2xl font-bold">DSpace Login</h2>
            <p className="text-gray-600">Login to upload files to DSpace</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
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
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login to DSpace'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Upload to DSpace Repository</h1>
        <Button variant="secondary" onClick={handleLogout}>Logout</Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Form */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Upload New Item</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Collection Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Collection *</label>
              <select
                name="collectionId"
                value={formData.collectionId}
                onChange={handleInputChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4A70A9]"
              >
                <option value="">Select Collection</option>
                {collections.map(collection => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="Separate multiple authors with semicolons"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4A70A9]"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4A70A9]"
              />
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4A70A9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4A70A9]"
                >
                  <option value="document">Document</option>
                  <option value="article">Article</option>
                  <option value="thesis">Thesis</option>
                  <option value="report">Report</option>
                  <option value="book">Book</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#4A70A9]"
                >
                  <option value="en">English</option>
                  <option value="am">Amharic</option>
                  <option value="or">Oromo</option>
                  <option value="ti">Tigrinya</option>
                </select>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Files</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-4">Drag and drop files here, or click to select</p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="inline-block bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Select Files</span>
                </label>
              </div>
              
              {/* Selected Files */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <File className="w-5 h-5 mr-2 text-gray-500" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-4">
              <Button type="button" variant="secondary">Save as Draft</Button>
              <Button type="submit" disabled={uploading || !formData.title}>
                {uploading ? 'Uploading...' : 'Upload to Repository'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Uploaded Items */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Recent Uploads</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {uploadedItems.map(item => (
              <div key={item.id} className="p-3 border border-gray-200 rounded-lg">
                <h3 className="font-medium">{item.sections?.traditionalpageone?.['dc.title']?.[0]?.value || 'Untitled'}</h3>
                <p className="text-sm text-gray-600">ID: {item.id}</p>
                <p className="text-sm text-gray-500">Collection: {item.collection?.name}</p>
              </div>
            ))}
            {uploadedItems.length === 0 && (
              <p className="text-gray-500 text-center py-8">No items uploaded yet</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DSpaceUpload;