import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const KohaCatalog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    year: '',
    subject: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!user || !user.is_staff) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('Authenticating with Koha and creating record...');

    try {
      // Auto-authenticate and create record in one step
      const response = await fetch('/api/koha/create-biblio/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ Record created in Koha! ID: ${result.biblio_id}\nView at: ${result.opac_url}`);
        setFormData({
          title: '',
          author: '',
          isbn: '',
          publisher: '',
          year: '',
          subject: '',
          description: ''
        });
      } else {
        const error = await response.json();
        setMessage(`❌ Error: ${error.error || 'Failed to create record'}`);
      }
    } catch (error) {
      setMessage(`❌ Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-[#EFECE3] py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center mb-6">
          <Button 
            variant="secondary" 
            onClick={() => navigate('/admin-choice')}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <BookOpen className="w-8 h-8 text-[#4A70A9] mr-3" />
          <h1 className="text-3xl font-bold text-[#4A70A9]">Koha Cataloging</h1>
        </div>

        <Card className="p-8">
          <h2 className="text-xl font-semibold text-[#4A70A9] mb-6">
            Create New Bibliographic Record
          </h2>

          {message && (
            <div className={`p-4 rounded-lg mb-6 ${
              message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A70A9] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Author
                </label>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A70A9] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ISBN
                </label>
                <input
                  type="text"
                  name="isbn"
                  value={formData.isbn}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A70A9] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publisher
                </label>
                <input
                  type="text"
                  name="publisher"
                  value={formData.publisher}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A70A9] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publication Year
                </label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A70A9] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A70A9] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description/Abstract
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A70A9] focus:border-transparent"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setFormData({
                  title: '',
                  author: '',
                  isbn: '',
                  publisher: '',
                  year: '',
                  subject: '',
                  description: ''
                })}
              >
                Clear Form
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.title}
              >
                {loading ? 'Creating...' : 'Create Record'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default KohaCatalog;