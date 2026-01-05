import { Link } from 'react-router-dom';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-[#4A70A9] mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button>Return Home</Button>
        </Link>
      </Card>
    </div>
  );
};

export default NotFound;