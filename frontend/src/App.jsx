import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Layout/Navbar";
import Footer from "./components/Layout/Footer";
import Home from "./pages/Home";
import MetadataEditor from "./pages/MetadataEditor";
import SignIn from "./pages/SignIn";
import { AuthProvider } from "./contexts/AuthContext";

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
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<div className="p-8 text-center">Signup feature not implemented in this demo.</div>} />
              <Route path="/profile" element={<div className="p-8 text-center">Profile page placeholder.</div>} />
              <Route path="/admin-choice" element={<div className="p-8 text-center">Admin dashboard placeholder.</div>} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
