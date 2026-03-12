import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";

const ProtectedRoute = ({ children }) => {
	const { user, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return (
			<div className="flex h-screen w-full items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!user) {
		// Redirect to signin but save the attempted location
		return <Navigate to="/signin" state={{ from: location }} replace />;
	}

	return children;
};

export default ProtectedRoute;
