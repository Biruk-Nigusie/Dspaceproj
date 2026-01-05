import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { BookOpen, Upload, BarChart3 } from 'lucide-react';

const AdminChoice = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#EFECE3] flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#4A70A9] mb-2">
            Welcome, {user.first_name || user.username}
          </h1>
          <p className="text-gray-600">Choose your administrative task</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Koha Cataloging */}
          <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
            <BookOpen className="w-16 h-16 text-[#4A70A9] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#4A70A9] mb-2">
              Catalog Resources
            </h3>
            <p className="text-gray-600 mb-4">
              Manage bibliographic records in Koha library system
            </p>
            <Button 
              onClick={() => navigate('/koha-catalog')}
              className="w-full"
            >
              Catalog
            </Button>
          </Card>

          {/* DSpace Upload */}
          <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
            <Upload className="w-16 h-16 text-[#4A70A9] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#4A70A9] mb-2">
              Upload Files
            </h3>
            <p className="text-gray-600 mb-4">
              Upload and manage digital resources in DSpace
            </p>
            <Button 
              onClick={() => navigate('/dspace-upload')}
              className="w-full"
            >
              Upload
            </Button>
          </Card>

          {/* Analytics */}
          <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
            <BarChart3 className="w-16 h-16 text-[#4A70A9] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#4A70A9] mb-2">
              View Analytics
            </h3>
            <p className="text-gray-600 mb-4">
              Monitor system usage and generate reports
            </p>
            <Button 
              onClick={() => navigate('/analytics')}
              className="w-full"
            >
              View Dashboard
            </Button>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button 
            variant="secondary"
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminChoice;