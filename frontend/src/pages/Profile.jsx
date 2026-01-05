import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Download, Heart, Book, Upload, File } from 'lucide-react';
import axios from 'axios';
import Card from '../components/UI/Card';
import Badge from '../components/UI/Badge';
import Button from '../components/UI/Button';

const Profile = () => {
  const { user } = useAuth();
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    authors: '',
    resource_type: 'document',
    year: new Date().getFullYear(),
    file: null
  });

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const downloadsResponse = await axios.get('/api/resources/downloads/');
      setDownloads(downloadsResponse.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.title) {
      alert('Please select a file and enter a title');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadForm.file);
    formData.append('title', uploadForm.title);
    formData.append('description', uploadForm.description);
    formData.append('authors', uploadForm.authors);
    formData.append('resource_type', uploadForm.resource_type);
    formData.append('year', uploadForm.year);

    try {
      const response = await axios.post('/api/resources/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('File uploaded successfully!');
      setUploadForm({
        title: '',
        description: '',
        authors: '',
        resource_type: 'document',
        year: new Date().getFullYear(),
        file: null
      });
      document.getElementById('file-input').value = '';
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please Sign In</h2>
          <p>You need to be signed in to view your profile.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>

      {/* Profile Information */}
      <Card className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <p className="text-gray-900">{user.first_name} {user.last_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-gray-900">{user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <p className="text-gray-900">{user.username}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <Badge variant={user.role === 'admin' ? 'koha' : 'default'}>
              {user.role.toUpperCase()}
            </Badge>
          </div>
        </div>
        <div className="mt-6">
          <Button variant="secondary">Update Profile</Button>
        </div>
      </Card>

      {/* Downloads History */}
      <Card className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Download className="w-5 h-5 mr-2" />
          Downloads History
        </h2>
        {loading ? (
          <p>Loading downloads...</p>
        ) : downloads.length > 0 ? (
          <div className="space-y-4">
            {downloads.map((download) => (
              <div key={download.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium">{download.resource_title}</h3>
                  <p className="text-sm text-gray-600">
                    Downloaded on {new Date(download.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <Button size="sm" variant="secondary">
                  <Download className="w-4 h-4 mr-2" />
                  Download Again
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No downloads yet.</p>
        )}
      </Card>

      {/* Borrowed Items (Koha Integration) */}
      <Card className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Book className="w-5 h-5 mr-2" />
          Borrowed Items
        </h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-600">
            Koha integration coming soon. This will show your currently borrowed books and due dates.
          </p>
        </div>
      </Card>

      {/* File Upload */}
      <Card className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Upload className="w-5 h-5 mr-2" />
          Upload Resource
        </h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Authors</label>
              <input
                type="text"
                value={uploadForm.authors}
                onChange={(e) => setUploadForm({...uploadForm, authors: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Author Name(s)"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={uploadForm.description}
              onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded h-24"
              placeholder="Brief description of the resource"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={uploadForm.resource_type}
                onChange={(e) => setUploadForm({...uploadForm, resource_type: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="document">Document</option>
                <option value="report">Report</option>
                <option value="research">Research Paper</option>
                <option value="presentation">Presentation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="number"
                value={uploadForm.year}
                onChange={(e) => setUploadForm({...uploadForm, year: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded"
                min="1900"
                max={new Date().getFullYear() + 1}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
            <input
              id="file-input"
              type="file"
              onChange={(e) => setUploadForm({...uploadForm, file: e.target.files[0]})}
              className="w-full p-2 border border-gray-300 rounded"
              accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
              required
            />
            <p className="text-sm text-gray-500 mt-1">Supported formats: PDF, DOC, DOCX, TXT, PPT, PPTX</p>
          </div>
          
          <Button type="submit" disabled={uploading} className="w-full md:w-auto">
            {uploading ? (
              <>
                <File className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Resource
              </>
            )}
          </Button>
        </form>
      </Card>

      {/* Favorites */}
      <Card>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Heart className="w-5 h-5 mr-2" />
          Favorites
        </h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-600">
            No favorites yet. Start exploring resources and add them to your favorites!
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Profile;