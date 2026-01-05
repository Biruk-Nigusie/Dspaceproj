import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import SearchResults from './pages/SearchResults';
import ResourceDetails from './pages/ResourceDetails';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';
import AdminChoice from './pages/AdminChoice';
import KohaCatalog from './pages/KohaCatalog';
import DSpaceUpload from './pages/DSpaceUpload';
import FileUpload from './pages/FileUpload';
import IntegratedUpload from './pages/IntegratedUpload';

import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/resource/:id" element={<ResourceDetails />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin-choice" element={<AdminChoice />} />

              <Route path="/koha-catalog" element={<KohaCatalog />} />
              <Route path="/dspace-upload" element={<DSpaceUpload />} />
              <Route path="/file-upload" element={<FileUpload />} />
              <Route path="/integrated-upload" element={<IntegratedUpload />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;