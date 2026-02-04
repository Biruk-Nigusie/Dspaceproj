import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Layout/Navbar";
import Footer from "./components/Layout/Footer";
import Home from "./pages/Home";
import MetadataEditor from "./pages/MetadataEditor";
import CatalogPage from "./pages/CatalogPage";
import SignIn from "./pages/SignIn";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/editor" element={<MetadataEditor />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<div className="p-8 text-center">Signup feature not implemented in this demo.</div>} />
              <Route path="/profile" element={<div className="p-8 text-center">Profile page placeholder.</div>} />
              <Route path="/admin-choice" element={<div className="p-8 text-center">Admin dashboard placeholder.</div>} />
            </Routes>
          </main>
          <Footer />
          <ToastContainer position="bottom-right" autoClose={3000} />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
