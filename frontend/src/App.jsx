import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Footer from "@/components/shared/footer";
import Navbar from "@/components/shared/navbar";
import { AuthProvider } from "@/contexts/auth-context";
import Home from "@/pages/home";
import MetadataEditor from "@/pages/metadata-editor";
import SignIn from "@/pages/sign-in";

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
						</Routes>
					</main>
					<Footer />
				</div>
			</AuthProvider>
		</Router>
	);
}

export default App;
