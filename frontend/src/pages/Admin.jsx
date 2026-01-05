import { Link } from 'react-router-dom';
import Card from '../components/UI/Card';

const Admin = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>
      <Card>
        <p>Admin functionality coming soon...</p>
        <Link to="/admin-choice" className="text-blue-600 hover:underline">
          Go to Admin Choice
        </Link>
      </Card>
    </div>
  );
};

export default Admin;