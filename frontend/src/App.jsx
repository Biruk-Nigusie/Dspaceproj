import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Footer from "./components/Layout/Footer";
import Navbar from "./components/Layout/Navbar";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import MetadataEditor from "./pages/MetadataEditor";
import Profile from "./pages/Profile";
import SignIn from "./pages/SignIn";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/editor" element={<MetadataEditor />} />
              <Route path="/signin" element={<SignIn />} />
              <Route
                path="/signup"
                element={
                  <div className="p-8 text-center">
                    Signup feature not implemented in this demo.
                  </div>
                }
              />
              <Route path="/profile" element={<Profile />} />
              <Route
                path="/admin-choice"
                element={
                  <div className="p-8 text-center">
                    Admin dashboard placeholder.
                  </div>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
