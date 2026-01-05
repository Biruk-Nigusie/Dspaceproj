import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import Card from '../components/UI/Card';
import LineChartComponent from '../components/Charts/LineChart';
import BarChartComponent from '../components/Charts/BarChart';
import PieChartComponent from '../components/Charts/PieChart';

const Analytics = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAnalytics();
    }
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`/api/analytics/dashboard/?days=${timeRange}`);
      setData(response.data);
    } catch (error) {
      console.error('Analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p>You need admin privileges to view analytics.</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={365}>Last 12 months</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="text-center">
          <h3 className="text-2xl font-bold text-[#4A70A9]">{data?.total_resources || 0}</h3>
          <p className="text-gray-600">Total Resources</p>
        </Card>
        <Card className="text-center">
          <h3 className="text-2xl font-bold text-[#4A70A9]">{data?.total_downloads || 0}</h3>
          <p className="text-gray-600">Total Downloads</p>
        </Card>
        <Card className="text-center">
          <h3 className="text-2xl font-bold text-[#4A70A9]">{data?.total_searches || 0}</h3>
          <p className="text-gray-600">Total Searches</p>
        </Card>
        <Card className="text-center">
          <h3 className="text-2xl font-bold text-[#4A70A9]">
            {data?.user_activity?.length || 0}
          </h3>
          <p className="text-gray-600">Active Days</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <LineChartComponent
            data={data?.downloads_per_month || []}
            dataKey="count"
            xAxisKey="month"
            title="Downloads per Month"
          />
        </Card>
        
        <Card>
          <BarChartComponent
            data={data?.top_searches || []}
            dataKey="count"
            xAxisKey="query"
            title="Top Search Keywords"
          />
        </Card>
        
        <Card>
          <PieChartComponent
            data={data?.source_distribution || []}
            dataKey="count"
            nameKey="source"
            title="Resource Source Distribution"
          />
        </Card>
        
        <Card>
          <BarChartComponent
            data={data?.popular_resources || []}
            dataKey="download_count"
            xAxisKey="title"
            title="Most Downloaded Resources"
          />
        </Card>
      </div>

      {/* User Activity Timeline */}
      <Card>
        <LineChartComponent
          data={data?.user_activity || []}
          dataKey="count"
          xAxisKey="date"
          title="User Activity Timeline"
        />
      </Card>
    </div>
  );
};

export default Analytics;