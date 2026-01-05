import { useState, useEffect } from 'react';
import { Folder, FileText, X, Upload } from 'lucide-react';
import Card from './UI/Card';
import Button from './UI/Button';
import dspaceService from '../services/dspaceService';

const HotFolderUploadForm = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    hotFolderPath: '',
    selectedCollection: ''
  });
  const [totalFiles, setTotalFiles] = useState(0);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCollections();
    }
  }, [isOpen]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const collectionsData = await dspaceService.getCollections();
      setCollections(collectionsData);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderSelect = async (e) => {
    const folderPath = e.target.value;
    setFormData(prev => ({ ...prev, hotFolderPath: folderPath }));
    
    if (folderPath) {
      try {
        // Count files in the selected folder
        const response = await fetch('/api/count-files/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder_path: folderPath })
        });
        
        if (response.ok) {
          const data = await response.json();
          setTotalFiles(data.total_files || 0);
        }
      } catch (error) {
        console.error('Error counting files:', error);
        setTotalFiles(0);
      }
    } else {
      setTotalFiles(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.hotFolderPath || !formData.selectedCollection) {
      alert('Please select both folder path and collection');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/bulk-upload/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hot_folder_path: formData.hotFolderPath,
          collection_id: formData.selectedCollection
        })
      });

      if (response.ok) {
        alert('Upload initiated successfully!');
        onClose();
        setFormData({ hotFolderPath: '', selectedCollection: '' });
        setTotalFiles(0);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({ hotFolderPath: '', selectedCollection: '' });
    setTotalFiles(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <Card className="border-0 shadow-none">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Bulk Upload</h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Hot Folder Path */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hot Folder Path *
              </label>
              <div className="relative">
                <Folder className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.hotFolderPath}
                  onChange={handleFolderSelect}
                  placeholder="/path/to/folder/containing/files"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Total Files Display */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Total Files:</span>
                </div>
                <span className="text-lg font-bold text-blue-600">
                  {totalFiles}
                </span>
              </div>
            </div>

            {/* Collection Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Collection *
              </label>
              <select
                value={formData.selectedCollection}
                onChange={(e) => setFormData(prev => ({ ...prev, selectedCollection: e.target.value }))}
                required
                disabled={loading}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">
                  {loading ? 'Loading collections...' : 'Choose a collection'}
                </option>
                {collections.map(collection => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
                className="flex-1"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 flex items-center justify-center"
                disabled={submitting || !formData.hotFolderPath || !formData.selectedCollection}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default HotFolderUploadForm;