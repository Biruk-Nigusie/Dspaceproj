import { Link, useNavigate } from "react-router-dom";
import { Search, User, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <nav className="bg-[#0C2B4E] text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center space-x-8">
                        <Link to="/" className="text-xl font-bold">
                            ኢትዮጵያ ቤተ መዛግብት እና ቤተ መጻሕፍት አገልግሎት (ወመዘክር)
                        </Link>
                        <div className="flex space-x-6">
                            {user && (
                                <Link to="/editor" className="hover:text-gray-200">
                                    Upload
                                </Link>
                            )}
                            {user?.role === "admin" && (
                                <Link to="/admin-choice" className="hover:text-gray-200">
                                    አስተዳዳሪ
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="relative"></div>

                        {user ? (
                            <div className="flex items-center space-x-4">
                                <Link to="/profile" className="flex items-center space-x-2 ">
                                    <User className="w-5 h-5" />
                                    <span>{user.first_name || user.username}</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center space-x-2 cursor-pointer"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span>ውጣ</span>
                                </button>
                            </div>
                        ) : (
                            <Link
                                to="/signin"
                                className="bg-white text-[#4A70A9] px-4 py-2 rounded-lg "
                            >
                                ግባ
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
