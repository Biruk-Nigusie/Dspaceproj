import axios from "axios";
import {
	CakeIcon,
	Calendar,
	CheckCircle,
	Download,
	FileBadgeIcon,
	FileText,
	Filter,
	FolderOpen,
	Globe,
	Heart,
	IdCardIcon,
	MapPin,
	RefreshCw,
	Search,
	UserPlus,
	Users,
	UsersIcon,
} from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HotFolderUploadForm from "../components/HotFolderUploadForm";
import Card from "../components/UI/Card";
import { AuthContext } from "../contexts/AuthContext";
import { ORG_NAME } from "../utils/constants";

const Home = () => {
	const [searchQuery, setSearchQuery] = useState("");
	const [allResources, setAllResources] = useState([]);
	const [loading, setLoading] = useState(false);
	const [showUploadForm, setShowUploadForm] = useState(false);
	const [stats, setStats] = useState({
		totalResources: 0,
		monthlyDownloads: 0,
		activeUsers: 0,
		communities: 0,
	});
	const [bulkUploadForm, setBulkUploadForm] = useState({
		directoryPath: "",
		totalFolders: 0,
		uploadedFolders: 0,
		selectedCollection: "",
		loading: false,
		uploading: false,
	});
	const [collections, setCollections] = useState([]);
	const { user, token } = useContext(AuthContext);
	const navigate = useNavigate();

	useEffect(() => {
		fetchAllResources();
		fetchSystemStats();
		if (user && token) {
			fetchCollections();
		}
	}, [user, token]);

	const fetchAllResources = async () => {
		setLoading(true);
		try {
			const response = await axios.get("/api/resources/search/?q=&limit=50");
			setAllResources(response.data.results || []);
		} catch (error) {
			console.error("Error fetching all resources:", error);
			setAllResources([]);
		} finally {
			setLoading(false);
		}
	};

	const fetchSystemStats = async () => {
		try {
			// Mock stats - replace with actual API call
			setStats({
				totalResources: 12457,
				monthlyDownloads: 5678,
				activeUsers: 890,
				communities: 12,
			});
		} catch (error) {
			console.error("Error fetching stats:", error);
		}
	};

	const handleSearch = (e) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
		}
	};

	const handleQuickSearch = (query) => {
		setSearchQuery(query);
		navigate(`/search?q=${encodeURIComponent(query)}`);
	};

	const fetchCollections = async () => {
		try {
			const authToken = localStorage.getItem("token");
			if (!authToken) return;
			const response = await axios.get("/api/resources/bulk/collections/", {
				headers: { Authorization: `Token ${authToken}` },
			});
			setCollections(response.data.collections || []);
		} catch (error) {
			console.error("Error fetching collections:", error);
		}
	};

	const handleDirectorySelect = async () => {
		if (!user) {
			alert("ጅምላ ስቀላ ለመጠቀም እባክዎ ይግቡ");
			return;
		}

		const input = document.createElement("input");
		input.type = "file";
		input.webkitdirectory = true;
		input.directory = true;
		input.multiple = true;

		input.onchange = async (e) => {
			const files = e.target.files;
			if (files.length === 0) return;

			// Extract directory path from the first file
			const firstFile = files[0];
			const relativePath = firstFile.webkitRelativePath;
			const folderName = relativePath.split("/")[0];

			// Common upload directory mappings
			const directoryMappings = {
				setA: "/home/biruk/uploads/setA",
				setB: "/home/biruk/uploads/setB",
				test_folder: "/home/biruk/uploads/test_folder",
				uploads: "/home/biruk/uploads",
			};

			// Use mapped path or ask user for full path
			let directoryPath = directoryMappings[folderName];
			if (!directoryPath) {
				directoryPath = prompt(
					`ለ'${folderName}' ዶሴ ሙሉ መንገድ ያስገቡ:`,
					`/home/biruk/uploads/${folderName}`,
				);
				if (!directoryPath) return;
			}

			setBulkUploadForm((prev) => ({ ...prev, loading: true, directoryPath }));

			try {
				const authToken = localStorage.getItem("token");
				const response = await axios.post(
					"/api/resources/bulk/count-folders/",
					{ directory_path: directoryPath },
					{ headers: { Authorization: `Token ${authToken}` } },
				);

				setBulkUploadForm((prev) => ({
					...prev,
					totalFolders: response.data.total_folders,
					uploadedFolders: response.data.uploaded_folders,
					loading: false,
				}));
			} catch (error) {
				console.error("Error counting folders:", error);
				alert("ዶሴ ማግኘት አልተቻለም። እባክዎ መንገዱን ያረጋግጡ።");
				setBulkUploadForm((prev) => ({
					...prev,
					loading: false,
					directoryPath: "",
				}));
			}
		};

		input.click();
	};

	const handleBulkUpload = async (e) => {
		e.preventDefault();

		if (!user) {
			alert("ለመስቀል እባክዎ ይግቡ");
			return;
		}

		if (!bulkUploadForm.directoryPath || !bulkUploadForm.selectedCollection) {
			alert("እባክዎ ዶሴ እና ስብስብ ይምረጡ");
			return;
		}

		console.log("User:", user);
		console.log("Directory Path:", bulkUploadForm.directoryPath);
		console.log("Selected Collection:", bulkUploadForm.selectedCollection);

		// if (!user.is_staff) {
		//   alert('Admin privileges required for bulk upload');
		//   return;
		// }

		setBulkUploadForm((prev) => ({ ...prev, uploading: true }));

		try {
			const authToken = localStorage.getItem("token");
			const response = await axios.post(
				"/api/resources/bulk/upload/",
				{
					directory_path: bulkUploadForm.directoryPath,
					collection_id: bulkUploadForm.selectedCollection,
				},
				{
					headers: { Authorization: `Token ${authToken}` },
				},
			);

			alert("በተሳካ ሁኔታ ወደ ዲጂታል ቋት ተስቅሏል!");
			setBulkUploadForm({
				directoryPath: "",
				totalFolders: 0,
				uploadedFolders: 0,
				selectedCollection: "",
				loading: false,
				uploading: false,
			});
		} catch (error) {
			console.error("Bulk upload error:", error);
			alert(error.response?.data?.error || "ጅምላ ስቀላ አልተሳካም");
			setBulkUploadForm((prev) => ({ ...prev, uploading: false }));
		}
	};

	const handleCancelUpload = () => {
		setBulkUploadForm({
			directoryPath: "",
			totalFolders: 0,
			uploadedFolders: 0,
			selectedCollection: "",
			loading: false,
			uploading: false,
		});
	};

	const vitalEvents = [
		{
			name: "የመዛግብት ስብስቦች",
			icon: UserPlus,
			color: "bg-gray-50",
			count: "4,231",
		},
		{ name: "የተሪክ መዝገቦች", icon: Heart, color: "bg-gray-50", count: "2,867" },
		{ name: "የመጻሕፍት ስብስቦች", icon: Users, color: "bg-gray-50", count: "1,542" },
		{ name: "የመረጃ ፋይሎች", icon: Users, color: "bg-gray-50", count: "893" },
		{ name: "ዓመታዊ ሪፖርቶች", icon: FileText, color: "bg-gray-50", count: "156" },
	];

	const subCities = [
		"Addis Ketema",
		"Akaki Kaliti",
		"Arada",
		"Bole",
		"Gulele",
		"Kirkos",
		"Kolfe Keranio",
		"Lideta",
		"Nifas Silk-Lafto",
		"Yeka",
		"Lemi Kura",
	];

	const quickSearches = [
		"የመዛግብት አስተዳደር ስራዎች",
		"የተሪክ መረጃዎች",
		"የኢትዮጵያ መጻሕፍት ስብስቦች",
		"የመዛግብት መንገድ መመሪያዎች",
		"ዲጂታል መዛግብት ስራዎች",
	];

	const formatSearchResult = (resource) => {
		const sourceMap = {
			koha: "Koha Library Catalog",
			dspace: "DSpace Repository",
			vufind: "VuFind Discovery",
		};

		const displayUrl =
			resource.source === "koha"
				? `koha.ethiopia.gov.et/catalogue/${resource.external_id}`
				: resource.source === "dspace"
				? `dspace.ethiopia.gov.et/handle/${resource.external_id}`
				: `vufind.ethiopia.gov.et/record/${resource.external_id}`;

		return (
			// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
			<div
				key={resource.id}
				className="border-b border-gray-200 pb-6 mb-6 cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors"
				onClick={() => {
					if (resource.source === "koha") {
						window.open(
							`http://127.0.0.1:8085/cgi-bin/koha/catalogue/detail.pl?biblionumber=${resource.external_id}`,
							"_blank",
						);
					} else if (resource.source === "dspace") {
						window.open(
							`http://localhost:4000/handle/${resource.external_id}`,
							"_blank",
						);
					} else if (resource.source === "vufind") {
						window.open(
							`http://localhost:8090/Record/${resource.external_id}`,
							"_blank",
						);
					} else {
						navigate(`/resource/${resource.id}`);
					}
				}}
			>
				<div className="flex items-start space-x-2 mb-1">
					<Globe className="w-4 h-4 text-gray-800 mt-1 shrink-0" />
					<div className="flex-1 min-w-0">
						<span className="text-sm text-gray-600 truncate">{displayUrl}</span>
					</div>
				</div>

				<h3 className="text-xl text-blue-600 hover:text-blue-800 mb-2 line-clamp-1 font-medium">
					{resource.title}
				</h3>

				<div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
					<span className="flex items-center">
						<Calendar className="w-4 h-4 mr-1 text-gray-800" />
						{resource.year || "N/A"}
					</span>
					<span className="bg-gray-100 px-2 py-1 rounded text-xs">
						{resource.resource_type}
					</span>
					<span className="bg-gray-100 px-2 py-1 rounded text-xs">
						{sourceMap[resource.source] || resource.source}
					</span>
				</div>

				<p className="text-gray-700 text-sm line-clamp-2">
					{resource.description || "ለዚህ ሀብት ምንም መግለጫ የለም።"}
				</p>

				{resource.external_id && (
					<div className="mt-2 text-xs text-gray-500 flex items-center space-x-4">
						<span>Document ID: {resource.external_id}</span>
						<span className="flex items-center">
							<Download className="w-3 h-3 mr-1 text-gray-800" />
							PDF • 2.3 MB
						</span>
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="min-h-screen bg-white">
			{/* Hero Section */}
			<section className="bg-primary py-16 text-primary-foreground">
				<div className="max-w-6xl mx-auto px-4">
					<div className="text-center mb-8">
						<h1 className="text-5xl font-bold mb-4">{ORG_NAME}</h1>
					</div>

					<form onSubmit={handleSearch} className="max-w-3xl mx-auto">
						<div className="relative">
							<Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="የነዋሪነት፣ ወሳኝ ኩነት መረጃዎች ይፈልጉ..."
								className="w-full pl-12 pr-32 py-4 text-lg bg-white text-gray-800 rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none shadow-sm"
							/>
							<button
								type="submit"
								className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#1A3D64] hover:bg-[#2A4D74] text-white px-8 py-2 rounded-lg font-medium transition-colors cursor-pointer"
							>
								ፈልግ
							</button>
						</div>
					</form>
				</div>
			</section>

			{/* Bulk Upload Form Section */}
			{user && (
				<section className="bg-gray-50 py-12 border-b border-gray-200">
					<div className="max-w-4xl mx-auto px-4">
						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
							<h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
								ጅምላ መዛግብት ስቀላ
							</h2>
							<p className="text-gray-600 text-center mb-8">
								ከአንድ ዶሴ ብዙ ፋይሎችን ወደ ዲጂታል ቋት ስብስብዎ ይስቀሉ
							</p>

							<form onSubmit={handleBulkUpload} className="space-y-6">
								{/* Set Path File Selection */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										የመንገድ ፋይል ምርጫ ያዘጋጁ
									</label>
									<div className="flex items-center space-x-3">
										<input
											type="text"
											value={bulkUploadForm.directoryPath}
											placeholder="የዶሴ መንገድ ይምረጡ..."
											className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
											readOnly
										/>
										<button
											type="button"
											onClick={handleDirectorySelect}
											disabled={
												bulkUploadForm.loading || bulkUploadForm.uploading
											}
											className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center cursor-pointer"
										>
											{bulkUploadForm.loading ? (
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
											) : (
												<FolderOpen className="w-4 h-4 mr-2" />
											)}
											አስስ
										</button>
									</div>
								</div>

								{/* Total Files */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										ጠቅላላ ዶሴዎች
									</label>
									<div className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3">
										{bulkUploadForm.directoryPath ? (
											<div className="flex items-center justify-between">
												<span className="text-gray-600">
													{bulkUploadForm.totalFolders} ጠቅላላ ዶሴዎች፣{" "}
													{bulkUploadForm.uploadedFolders} ቀድሞውኑ ተስቅለዋል
												</span>
												{bulkUploadForm.totalFolders > 0 && (
													<CheckCircle className="w-5 h-5 text-green-600" />
												)}
											</div>
										) : (
											<span className="text-gray-600">ምንም ዶሴ አልተመረጠም</span>
										)}
									</div>
								</div>

								{/* Select Collection */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										ስብስብ ይምረጡ
									</label>
									<select
										value={bulkUploadForm.selectedCollection}
										onChange={(e) =>
											setBulkUploadForm((prev) => ({
												...prev,
												selectedCollection: e.target.value,
											}))
										}
										className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
										disabled={bulkUploadForm.uploading}
									>
										<option value="">የዲጂታል ቋት ስብስብ ይምረጡ...</option>
										{collections.map((collection) => (
											<option key={collection.id} value={collection.id}>
												{collection.name}
											</option>
										))}
									</select>
								</div>

								{/* Action Buttons */}
								<div className="flex justify-center space-x-4 pt-6">
									<button
										type="button"
										onClick={handleCancelUpload}
										disabled={bulkUploadForm.uploading}
										className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
									>
										ሰርዝ
									</button>
									<button
										type="submit"
										disabled={
											!bulkUploadForm.directoryPath ||
											!bulkUploadForm.selectedCollection ||
											bulkUploadForm.uploading
										}
										className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors cursor-pointer flex items-center"
									>
										{bulkUploadForm.uploading ? (
											<>
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
												በመስቀል ላይ...
											</>
										) : (
											"አስገባ"
										)}
									</button>
								</div>
							</form>
						</div>
					</div>
				</section>
			)}

			{/* Search Results Section */}
			<section className="bg-white py-8 border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4">
					<div className="flex justify-between items-center mb-6">
						<h2 className="text-2xl font-bold text-gray-900">
							የቅርብ ጊዜ
							<span className="text-gray-500 text-lg ml-2">
								({allResources.length} ውጤቶች)
							</span>
						</h2>
						<div className="flex space-x-4">
							<button
								type="button"
								onClick={fetchAllResources}
								className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center cursor-pointer"
							>
								<RefreshCw className="w-4 h-4 mr-2" />
								አድስ
							</button>
							<button
								type="button"
								onClick={() => navigate("/advanced-search")}
								className="border border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors flex items-center cursor-pointer"
							>
								<Filter className="w-4 h-4 mr-2 text-gray-800" />
								የላቀ ፍለጋ
							</button>
						</div>
					</div>

					{loading ? (
						<div className="text-center py-12">
							<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800" />
							<p className="mt-4 text-gray-600 text-lg">
								መዛግብት እና መጻሕፍት በመጫን ላይ...
							</p>
						</div>
					) : allResources.length === 0 ? (
						<Card className="text-center py-12 border border-gray-200">
							<FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
							<h3 className="text-xl font-semibold text-gray-900 mb-2">
								ምንም መዝገቦች አልተገኙም
							</h3>
							<p className="text-gray-600 mb-4">
								የፍለጋ መስፈርቶችዎን ማስተካከል ወይም በምድብ ማሰስ ይሞክሩ
							</p>
							<button
								type="button"
								onClick={fetchAllResources}
								className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-medium cursor-pointer"
							>
								ናሙና መዝገቦች ጫን
							</button>
						</Card>
					) : (
						<div className="bg-white rounded-lg border border-gray-200 p-6">
							<div className="mb-6">
								<h3 className="text-lg font-semibold text-gray-900 mb-2">
									የኢትዮጵያ ቤተ መዛግብት እና ቤተ መጻሕፍት ማህበረሰብ
								</h3>
								<p className="text-gray-600">
									ከኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ የመዛግብት እና መጻሕፍት መረጃ
								</p>
							</div>

							<div className="space-y-1">
								{allResources.map(formatSearchResult)}
							</div>

							<div className="text-center mt-8">
								<button
									type="button"
									onClick={() => navigate("/search")}
									className="bg-white border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-3 rounded-lg font-medium transition-colors cursor-pointer"
								>
									ተጨማሪ ውጤቶች አሳይ
								</button>
							</div>
						</div>
					)}
				</div>
			</section>

			<section className="py-16">
				<div className="text-center mb-12">
					<h2 className="text-4xl font-bold text-gray-900 mb-4">
						የሚሰጣቸው አገልግሎቶች
					</h2>
				</div>
				<div className="max-w-7xl mx-auto mt-12 text-center">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<div className="shadow bg-primary/90 text-primary-foreground rounded-lg p-6 flex justify-center items-center">
							<h3 className="text-xl font-semibold">
								አባትነትን በፍርድ ቤት ማወቅ ምዝገባና ማስረጃ
							</h3>
						</div>
						<div className="shadow bg-primary/90 text-primary-foreground rounded-lg p-6 flex justify-center items-center">
							<h3 className="text-xl font-semibold">ልጅነትን መቀበል ምዝገባና ማስረጃ</h3>
						</div>
						<div className="shadow bg-primary/90 text-primary-foreground rounded-lg p-6 flex justify-center items-center">
							<h3 className="text-xl font-semibold">የነዋሪነት ማረጋገጫ አገልግሎት</h3>
						</div>
						<div className="shadow bg-primary/90 text-primary-foreground rounded-lg p-6 flex justify-center items-center">
							<h3 className="text-xl font-semibold">የነዋሪነት መሸኛ አገልግሎት</h3>
						</div>
						<div className="shadow bg-primary/90 text-primary-foreground rounded-lg p-6 flex justify-center items-center">
							<h3 className="text-xl font-semibold">የያላገባ የምስክር ወረቀት</h3>
						</div>
						<div className="shadow bg-primary/90 text-primary-foreground rounded-lg p-6 flex justify-center items-center">
							<h3 className="text-xl font-semibold">
								የልደት, የጉዲፈቻ, የጋብቻ, የፍቺ, የሞት የምስክር ወረቀት
							</h3>
						</div>
					</div>
				</div>
			</section>

			<div className="max-w-7xl mx-auto px-4 py-12">
				{/* System Overview */}
				<section className="mb-16">
					<div className="text-center mb-12">
						<h2 className="text-4xl font-bold text-gray-900 mb-4">
							{`${ORG_NAME} ቁጥራዊ መረጃዎች`}
						</h2>
					</div>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
						<Card className="group text-center bg-linear-to-br from-blue-50 to-white hover:from-blue-100 hover:to-blue-50 transition-shadow border border-gray-200 shadow-sm hover:shadow-xl rounded-2xl p-6 cursor-pointer">
							<UsersIcon className="w-10 h-10 text-blue-700 mx-auto mb-4 group-hover:scale-110 transition-transform" />
							<h3 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
								3.2M
							</h3>
							<p className="text-gray-700 font-medium text-base">
								የተመዘገቡ ነዋሪዎች
							</p>
						</Card>
						<Card className="group text-center bg-linear-to-br from-indigo-50 to-white hover:from-indigo-100 hover:to-indigo-50 transition-shadow border border-gray-200 shadow-sm hover:shadow-xl rounded-2xl p-6 cursor-pointer">
							<IdCardIcon className="w-10 h-10 text-indigo-700 mx-auto mb-4 group-hover:scale-110 transition-transform" />
							<h3 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
								2.7M
							</h3>
							<p className="text-gray-700 font-medium text-base">ዲጂታል መታወቅያ</p>
						</Card>
						<Card className="group text-center bg-linear-to-br from-green-50 to-white hover:from-green-100 hover:to-green-50 transition-shadow border border-gray-200 shadow-sm hover:shadow-xl rounded-2xl p-6 cursor-pointer">
							<FileBadgeIcon className="w-10 h-10 text-green-700 mx-auto mb-4 group-hover:scale-110 transition-transform" />
							<h3 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
								347.1K
							</h3>
							<p className="text-gray-700 font-medium text-base">ያገባ</p>
						</Card>
						<Card className="group text-center bg-linear-to-br from-red-50 to-white hover:from-red-100 hover:to-red-50 transition-shadow border border-gray-200 shadow-sm hover:shadow-xl rounded-2xl p-6 cursor-pointer">
							<FileBadgeIcon className="w-10 h-10 text-red-700 mx-auto mb-4 group-hover:scale-110 transition-transform" />
							<h3 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
								377.6K
							</h3>
							<p className="text-gray-700 font-medium text-base">ያላገባ</p>
						</Card>
						<Card className="group text-center bg-linear-to-br from-yellow-50 to-white hover:from-yellow-100 hover:to-yellow-50 transition-shadow border border-gray-200 shadow-sm hover:shadow-xl rounded-2xl p-6 cursor-pointer">
							<CakeIcon className="w-10 h-10 text-yellow-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
							<h3 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
								1.3M
							</h3>
							<p className="text-gray-700 font-medium text-base">የልደት ሰርትፊኬት</p>
						</Card>
						<Card className="group text-center bg-linear-to-br from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-shadow border border-gray-200 shadow-sm hover:shadow-xl rounded-2xl p-6 cursor-pointer">
							<FileBadgeIcon className="w-10 h-10 text-gray-700 mx-auto mb-4 group-hover:scale-110 transition-transform" />
							<h3 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
								84.6K
							</h3>
							<p className="text-gray-700 font-medium text-base">ሞት</p>
						</Card>
						<Card className="group text-center bg-linear-to-br from-pink-50 to-white hover:from-pink-100 hover:to-pink-50 transition-shadow border border-gray-200 shadow-sm hover:shadow-xl rounded-2xl p-6 cursor-pointer">
							<FileBadgeIcon className="w-10 h-10 text-pink-700 mx-auto mb-4 group-hover:scale-110 transition-transform" />
							<h3 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
								24.9K
							</h3>
							<p className="text-gray-700 font-medium text-base">ፍቺ</p>
						</Card>
						<Card className="group text-center bg-linear-to-br from-purple-50 to-white hover:from-purple-100 hover:to-purple-50 transition-shadow border border-gray-200 shadow-sm hover:shadow-xl rounded-2xl p-6 cursor-pointer">
							<FileBadgeIcon className="w-10 h-10 text-purple-700 mx-auto mb-4 group-hover:scale-110 transition-transform" />
							<h3 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
								2.1K
							</h3>
							<p className="text-gray-700 font-medium text-base">ጉዲፈቻ</p>
						</Card>
					</div>
				</section>

				{/* Regional Coverage */}
				<section className="mb-16">
					<h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
						ክፍለ ከታማዊ ሽፋን
					</h2>
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
						{subCities.map((region) => (
							<Card
								key={region}
								className="text-center hover:shadow-md transition-shadow cursor-pointer p-4 bg-white border border-gray-200"
								onClick={() =>
									navigate(
										`/search?region=${region.toLowerCase().replace(" ", "-")}`,
									)
								}
							>
								<MapPin className="w-8 h-8 text-gray-800 mx-auto mb-3" />
								<h3 className="font-semibold text-gray-900 text-sm">
									{region}
								</h3>
								<p className="text-xs text-gray-500 mt-1">የክፍለ ከተማ መራጃ</p>
							</Card>
						))}
					</div>
				</section>
			</div>

			{/* Hot Folder Upload Form */}
			<HotFolderUploadForm
				isOpen={showUploadForm}
				onClose={() => setShowUploadForm(false)}
			/>
		</div>
	);
};

export default Home;
