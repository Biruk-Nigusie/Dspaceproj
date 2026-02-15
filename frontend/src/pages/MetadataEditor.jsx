import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
	Check,
	ChevronDown,
	ChevronLeft,
	Eye,
	File as FileIcon,
	FileText,
	Image,
	Merge,
	Pencil,
	PlusCircleIcon,
	ChevronRight as RightIcon,
	RotateCw,
	Scissors,
	Trash2,
	Upload,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import { useRef } from "react";
import DynamicSubmissionForm from "../components/form/DynamicSubmissionForm";
import dspaceService from "../services/dspaceService";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const RepeatableField = ({ label, values, setValues, placeholder }) => {
	const addField = () => setValues([...values, ""]);
	const removeField = (index) =>
		setValues(values.filter((_, i) => i !== index));
	const updateField = (index, value) => {
		const newValues = [...values];
		newValues[index] = value;
		setValues(newValues);
	};

	return (
		<div>
			<label
				htmlFor={`repeatable-field-container-${label}`}
				className="block text-sm font-medium text-gray-700 mb-1"
			>
				{label}
			</label>
			<div id={`repeatable-field-container-${label}`}>
				{values.map((value, index) => (
					<div key={index} className="flex items-center mb-2">
						<input
							type="text"
							value={value}
							onChange={(e) => updateField(index, e.target.value)}
							placeholder={placeholder}
							autoComplete="off"
							className="grow p-2 border border-gray-300 rounded-sm focus:ring-blue-500 focus:border-blue-500"
						/>
						<button
							type="button"
							onClick={() => removeField(index)}
							className="ml-2 text-red-600 hover:text-red-800 cursor-pointer"
						>
							<Trash2 size={18} />
						</button>
					</div>
				))}
			</div>
			<button
				type="button"
				onClick={addField}
				className="flex items-center text-sm text-blue-900 hover:text-blue-800"
			>
				<PlusCircleIcon size={16} className="mr-1" />
				Add {label}
			</button>
		</div>
	);
};

const MetadataEditor = () => {
	// File
	const [files, setFiles] = useState([]);
	const [selectedFileId, setSelectedFileId] = useState(null);
	const selectedFile = files.find((f) => f.id === selectedFileId);

	// Collections
	const [collections, setCollections] = useState([]);
	const [collectionId, setCollectionId] = useState("");
	const [collectionPage, setCollectionPage] = useState(0);
	const [collectionTotalPages, setCollectionTotalPages] = useState(1);
	const [loadingCollections, setLoadingCollections] = useState(false);
	const [showCollectionDropdown, setShowCollectionDropdown] = useState(false);

	// Metadata
	const [houseNumber, setHouseNumber] = useState("");
	const [husbandName, setHusbandName] = useState("");
	const [wifeName, setWifeName] = useState("");
	const [additionalFamilyHeads, setAdditionalFamilyHeads] = useState([""]);
	const [nationalID, setNationalID] = useState("");
	const [dateOfRegistration, setDateOfRegistration] = useState("");
	const [identifiers, setIdentifiers] = useState([
		{ type: "Other", value: "" },
	]);
	const [familyCount, setFamilyCount] = useState(0);
	const [familySummary, setFamilySummary] = useState("");

	// PDF viewer states
	const [primaryFileId, setPrimaryFileId] = useState(null);
	const [numPages, setNumPages] = useState(null);
	const [pageNumber, setPageNumber] = useState(1);
	const [scale, setScale] = useState(1.0);
	const [pdfError, setPdfError] = useState(null);

	const [uploading, setUploading] = useState(false);
	const [showFileDropdown, setShowFileDropdown] = useState(false);

	// Refs
	const collectionDropdownRef = useRef(null);

	// Merge Modal states
	const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
	const [filesToMerge, setFilesToMerge] = useState([]); // Array of IDs
	const [mergeFileName, setMergeFileName] = useState("");

	// Split Modal states
	const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
	const [splitPages, setSplitPages] = useState("");
	const [splitNames, setSplitNames] = useState([]);

	// Rename Modal states
	const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
	const [renameNewName, setRenameNewName] = useState("");

	const updateFileInList = (fileId, newFileObj, newName) => {
		const newUrl = URL.createObjectURL(newFileObj);
		setFiles((prev) =>
			prev.map((f) => {
				if (f.id === fileId) {
					return {
						...f,
						fileObject: newFileObj,
						fileUrl: newUrl,
						size: newFileObj.size,
						name: newName || f.name,
						lastModified: new Date(),
					};
				}
				return f;
			}),
		);
		// If updating the selected file, force reload
		if (selectedFileId === fileId) {
			setPageNumber(1);
		}
	};

	const handleRotate = async (angle) => {
		if (!selectedFile) return;
		try {
			const formData = new FormData();
			formData.append("file", selectedFile.fileObject);
			formData.append("page", pageNumber);
			formData.append("angle", angle);

			const response = await fetch("/api/resources/pdf/rotate/", {
				method: "POST",
				body: formData,
			});

			if (response.ok) {
				const blob = await response.blob();
				const newFile = new File([blob], selectedFile.name, {
					type: "application/pdf",
				});
				updateFileInList(selectedFile.id, newFile);
			} else {
				alert("Rotate failed");
			}
		} catch (error) {
			console.error(error);
			alert("Rotate error");
		}
	};

	const handleSplit = () => {
		if (!selectedFile) return;
		setSplitPages(String(pageNumber));
		const baseName = selectedFile.name.replace(".pdf", "");
		// Initial split assumes 1 split point -> 2 files.
		setSplitNames([`${baseName}_part1`, `${baseName}_part2`]);
		setIsSplitModalOpen(true);
	};

	// Recalculate name inputs when split pages change
	useEffect(() => {
		if (!isSplitModalOpen) return;

		const points = splitPages.split(",").filter((p) => p.trim() !== "").length;
		const numParts = points + 1;

		setSplitNames((prev) => {
			const newNames = [...prev];
			// Adjust length
			if (newNames.length < numParts) {
				// Add missing
				for (let i = newNames.length; i < numParts; i++) {
					const baseName = selectedFile
						? selectedFile.name.replace(".pdf", "")
						: "file";
					newNames.push(`${baseName}_part${i + 1}`);
				}
			} else if (newNames.length > numParts && numParts > 0) {
				// Trim
				return newNames.slice(0, numParts);
			}
			return newNames;
		});
	}, [splitPages, isSplitModalOpen, selectedFile]);

	const handleSplitNameChange = (index, value) => {
		const newNames = [...splitNames];
		newNames[index] = value;
		setSplitNames(newNames);
	};

	const handleSplitSubmit = async () => {
		if (!selectedFile) return;
		try {
			const formData = new FormData();
			formData.append("file", selectedFile.fileObject);
			formData.append("pages", splitPages);

			// Pass names as JSON string to handle list
			formData.append("names", JSON.stringify(splitNames));

			const response = await fetch("/api/resources/pdf/split/", {
				method: "POST",
				body: formData,
			});

			if (response.ok) {
				const data = await response.json();

				// Process the returned files
				const newFiles = [];
				for (const fileData of data.files) {
					try {
						// Fetch the file blob to have a local File object
						const res = await fetch(fileData.url);
						const blob = await res.blob();

						const newFileItem = {
							id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
							name: fileData.name,
							type: "application/pdf",
							size: blob.size,
							lastModified: new Date(),
							fileObject: new File([blob], fileData.name, {
								type: "application/pdf",
							}),
							// We create an object URL for the blob like other files
							fileUrl: URL.createObjectURL(blob),
						};
						newFiles.push(newFileItem);
					} catch (e) {
						console.error("Failed to load split file", e);
					}
				}

				setFiles((prev) => [...prev, ...newFiles]);
				setIsSplitModalOpen(false);
				alert("Split successful! Files added to list.");
			} else {
				const err = await response.json();
				alert(`Split failed: ${err.error || "Unknown error"}`);
			}
		} catch (error) {
			console.error(error);
			alert("Split error");
		}
	};

	const handleRename = () => {
		if (!selectedFile) return;
		setRenameNewName(selectedFile.name.replace(".pdf", ""));
		setIsRenameModalOpen(true);
	};

	const handleRenameSubmit = async () => {
		if (!selectedFile || !renameNewName) return;

		try {
			const formData = new FormData();
			formData.append("file", selectedFile.fileObject);
			formData.append("title", renameNewName);

			const response = await fetch("/api/resources/pdf/rename/", {
				method: "POST",
				body: formData,
			});

			if (response.ok) {
				let finalName = renameNewName;
				if (!finalName.toLowerCase().endsWith(".pdf")) finalName += ".pdf";

				const blob = await response.blob();
				const newFile = new File([blob], finalName, {
					type: "application/pdf",
				});
				updateFileInList(selectedFile.id, newFile, finalName);
				setIsRenameModalOpen(false);
			} else {
				alert("Rename failed");
			}
		} catch (error) {
			console.error(error);
			alert("Rename error");
		}
	};

	// Initialize merge selection when modal opens
	useEffect(() => {
		if (isMergeModalOpen && selectedFile) {
			setFilesToMerge([selectedFile.id]);
			setMergeFileName(`merged_${selectedFile.name.replace(".pdf", "")}.pdf`);
		}
	}, [isMergeModalOpen, selectedFile]);

	const handleMergeClick = () => {
		if (!selectedFile) return;
		setIsMergeModalOpen(true);
	};

	const toggleFileForMerge = (fileId) => {
		setFilesToMerge((prev) => {
			if (prev.includes(fileId)) {
				return prev.filter((id) => id !== fileId);
			} else {
				return [...prev, fileId];
			}
		});
	};

	const handleMergeSubmit = async () => {
		if (filesToMerge.length < 2) {
			alert("Please select at least 2 files to merge.");
			return;
		}

		try {
			const formData = new FormData();

			// Append files in order of filesToMerge array (or maybe sort them?)
			// We'll preserve user selection order or file list order?
			// The user might want specific order. For now, let's use the order they appear in the file list for consistency,
			// or perhaps the order they were selected? simpler is file list order filtered by selection.

			// Merge in the order of selection (filesToMerge list order)
			// This ensures the file you initiated merge from comes first (if user expects that)
			// or respects the order they were added.
			const orderedFilesToMerge = filesToMerge
				.map((id) => files.find((f) => f.id === id))
				.filter(Boolean);

			orderedFilesToMerge.forEach((file) => {
				formData.append("files", file.fileObject);
			});

			const response = await fetch("/api/resources/pdf/merge/", {
				method: "POST",
				body: formData,
			});

			if (response.ok) {
				const blob = await response.blob();
				console.log("DEBUG: Merged blob size:", blob.size);
				let finalName = mergeFileName || "merged.pdf";
				if (!finalName.toLowerCase().endsWith(".pdf")) finalName += ".pdf";

				const newFile = new File([blob], finalName, {
					type: "application/pdf",
				});

				// Add as new file to list
				const newFileItem = {
					id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					name: finalName,
					type: "application/pdf",
					size: newFile.size,
					lastModified: new Date(),
					fileObject: newFile,
					fileUrl: URL.createObjectURL(newFile),
				};

				setFiles((prev) => [...prev, newFileItem]);
				setIsMergeModalOpen(false);
				alert("Merged file added to list");

				// Automatically select the new merged file
				// We need to wait for state update or pass the full object?
				// Actually handleFileSelect reads from 'files' state, which won't be updated yet here in this closure.
				// But handleFileSelect finds the file.
				// We can't immediately select it if it's not in state.

				// Workaround: Modify handleFileSelect to accept object or wait?
				// Better: Just set selectedFileId directly and ensure the effect or render picks it up?
				// But handleFileSelect does side effects like setting title and resetting page.

				// Let's use a timeout or update state in a way that we can trigger selection.
				// Or just push to state and then set ID.

				// We'll delay the selection slightly to allow state to propagate
				setTimeout(() => {
					handleFileSelect(newFileItem.id, newFileItem);
				}, 100);
			} else {
				alert("Merge failed");
			}
		} catch (error) {
			console.error(error);
			alert("Merge error");
		}
	};

	useEffect(() => {
		const fetchDspaceCollections = async () => {
			try {
				setLoadingCollections(true);
				const result = await dspaceService.getSubmitAuthorizedCollections(
					0,
					20,
				);
				setCollections(result.collections);
				setCollectionPage(0);
				setCollectionTotalPages(result.page.totalPages);
			} catch (error) {
				console.error("Failed to fetch DSpace collections:", error);
			} finally {
				setLoadingCollections(false);
			}
		};

		const fetchSubmissionForms = async () => {
			const forms = await dspaceService.getSubmissionForms();
			console.log("🚀 ~ fetchSubmissionForms ~ forms:", forms);
		};

		fetchDspaceCollections();
		fetchSubmissionForms();
	}, []);

	const loadMoreCollections = async () => {
		if (loadingCollections || collectionPage + 1 >= collectionTotalPages)
			return;

		try {
			setLoadingCollections(true);
			const nextPage = collectionPage + 1;
			const result = await dspaceService.getSubmitAuthorizedCollections(
				nextPage,
				20,
			);
			setCollections((prev) => [...prev, ...result.collections]);
			setCollectionPage(nextPage);
		} catch (error) {
			console.error("Failed to load more collections:", error);
		} finally {
			setLoadingCollections(false);
		}
	};

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				collectionDropdownRef.current &&
				!collectionDropdownRef.current.contains(event.target)
			) {
				setShowCollectionDropdown(false);
			}
		};

		if (showCollectionDropdown) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showCollectionDropdown]);

	const handleFileUpload = (event) => {
		const uploadedFiles = Array.from(event.target.files || []);

		const newFileItems = uploadedFiles.map((file) => ({
			id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			name: file.name,
			type: file.type,
			size: file.size,
			lastModified: new Date(file.lastModified),
			fileObject: file,
			fileUrl: URL.createObjectURL(file),
		}));

		const updatedFiles = [...files, ...newFileItems];
		setFiles(updatedFiles);

		if (newFileItems.length > 0 && !selectedFileId) {
			handleFileSelect(newFileItems[0].id);
		}

		event.target.value = "";
	};

	const handleFileSelect = (fileId, _fileObj = null) => {
		setSelectedFileId(fileId);
		// Do NOT overwrite user-entered title with filename
		// const file = fileObj || files.find((f) => f.id === fileId);
		// if (file) {
		//    setTitle(file.name);
		// }
		setShowFileDropdown(false);
		setPageNumber(1);
		setNumPages(null);
		setPdfError(null);
	};

	const handleSubmit = async () => {
		if (uploading || files.length === 0) {
			alert("Please select files to upload.");
			return;
		}

		if (!houseNumber || !collectionId || !wifeName || !husbandName) {
			alert(
				"Please fill all mandatory fields: House Number, Wife Name, Husband Name, and Collection",
			);
			return;
		}

		setUploading(true);

		// Check if user is authenticated with DSpace
		if (!dspaceService.isAuthenticated && !dspaceService.authToken) {
			alert("Please sign in before uploading.");
			setUploading(false);
			return;
		}

		try {
			// 1. Create workspace item
			const workspaceItem =
				await dspaceService.createWorkspaceItem(collectionId);
			const workspaceItemId = workspaceItem.id;

			// 2. Update metadata
			// Process identifiers
			const identifierMap = {
				ISBN: "dc.identifier.isbn",
				ISSN: "dc.identifier.issn",
				ISMN: "dc.identifier.ismn",
				URI: "dc.identifier.uri",
				"Gov't Doc #": "dc.identifier.govdoc",
				Other: "dc.identifier.other",
			};

			const processedIdentifiers = {};
			const otherIdentifiers = [];

			identifiers.forEach((id) => {
				if (!id.value || !id.value.trim()) return;

				if (id.type === "Other") {
					otherIdentifiers.push(id.value);
				} else {
					const key = identifierMap[id.type];
					if (key) {
						processedIdentifiers[key] = id.value;
					}
				}
			});

			if (otherIdentifiers.length > 0) {
				processedIdentifiers["dc.identifier.other"] = otherIdentifiers;
			}

			const rawMetadata = {
				"crvs.identifier.houseFamilyKey": `${houseNumber} - ${husbandName} - ${wifeName}`,
				"crvs.head.husband": husbandName,
				"crvs.head.wife": wifeName,
				"crvs.head.additional": additionalFamilyHeads.filter((a) => a.trim()),
				"crvs.head.nationalID": nationalID,
				"crvs.date.registration": dateOfRegistration,
				"crvs.family.count": familyCount,
				"crvs.description.summary": familySummary,
				...processedIdentifiers,
			};

			// Filter empty fields
			const metadataFields = Object.fromEntries(
				Object.entries(rawMetadata).filter(([_, v]) => {
					if (Array.isArray(v)) return v.length > 0;
					return v !== null && v !== undefined && v !== "";
				}),
			);
			console.log("🚀 ~ handleSubmit ~ metadataFields:", metadataFields);

			const metaSuccess = await dspaceService.updateMetadata(
				workspaceItemId,
				metadataFields,
			);
			if (!metaSuccess) {
				console.error(
					"Metadata update failed, but proceeding with file upload...",
				);
			}

			// 3. Upload files
			// Sort files so Primary is first (if selected), otherwise keeping order
			const filesToUpload = [...files].sort((a, b) => {
				if (a.id === primaryFileId) return -1;
				if (b.id === primaryFileId) return 1;
				return 0;
			});

			for (const fileItem of filesToUpload) {
				const uploadSuccess = await dspaceService.uploadFile(
					workspaceItemId,
					fileItem.fileObject,
				);
				if (!uploadSuccess) {
					console.error(`Failed to upload file: ${fileItem.name}`);
					// We continue even if one fails, or should we stop?
					// Usually better to try all.
				}
			}

			// 4. Accept license
			await dspaceService.acceptWorkspaceLicense(workspaceItemId);

			// 5. Submit to workflow
			await dspaceService.submitWorkspaceItem(workspaceItem);

			alert("Upload successful! Item submitted to workflow.");

			// Reset form
			setCollectionId("");
			setFiles([]);
			setPrimaryFileId(null);
			setSelectedFileId(null);
			setHouseNumber("");
			setHusbandName("");
			setWifeName("");
			setAdditionalFamilyHeads([""]);
			setNationalID("");
			setDateOfRegistration("");
			setFamilyCount("");
			setFamilySummary("");
			setIdentifiers([[{ type: "Other", value: "" }]]);
		} catch (e) {
			console.error("Critical upload error:", e);
			alert(`Upload failed: ${e?.message || e}`);
		} finally {
			setUploading(false);
		}
	};

	const getFileIcon = (type) => {
		if (type.startsWith("image/")) return <Image className="w-4 h-4" />;
		if (type.includes("pdf")) return <FileText className="w-4 h-4" />;
		return <FileIcon className="w-4 h-4" />;
	};

	const formatFileSize = (bytes) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	};

	const onDocumentLoadSuccess = ({ numPages }) => {
		setNumPages(numPages);
		setPageNumber(1);
		setPdfError(null);
	};

	const handleIdentifierChange = (index, field, value) => {
		const newIdentifiers = [...identifiers];
		newIdentifiers[index][field] = value;
		setIdentifiers(newIdentifiers);
	};
	const addIdentifier = () => {
		setIdentifiers([...identifiers, { type: "Other", value: "" }]);
	};
	const removeIdentifier = (index) =>
		setIdentifiers(identifiers.filter((_, i) => i !== index));

	const onDocumentLoadError = (_error) => setPdfError("Failed to load PDF.");
	const changePage = (offset) =>
		setPageNumber((prev) => Math.min(Math.max(prev + offset, 1), numPages));
	const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0));
	const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

	const identifierOptions = [
		"Other",
		"ISSN",
		"ISMN",
		"Gov't Doc #",
		"URI",
		"ISBN",
	];

	return (
		<div className="flex flex-col h-screen bg-gray-50">
			{/* Top Bar */}
			<div className="bg-white border-b border-gray-300 p-3">
				<div className="flex items-center justify-between">
					<h1 className="text-lg font-bold text-gray-800 ml-4">Upload File</h1>
					<div className="flex items-center space-x-3 mr-4">
						<label className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm">
							<Upload className="w-3 h-3 mr-1" />
							Upload Files
							<input
								type="file"
								multiple
								onChange={handleFileUpload}
								className="hidden"
							/>
						</label>

						<div className="relative">
							<button
								type="button"
								onClick={() => setShowFileDropdown(!showFileDropdown)}
								className="flex items-center px-3 py-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-sm cursor-pointer"
							>
								<Eye className="w-3 h-3 mr-1.5 text-gray-600" />
								<span className="text-gray-700">
									{selectedFile ? selectedFile.name : "Select File"}
								</span>
								<ChevronDown
									className={`w-3 h-3 ml-1.5 text-gray-500 transition-transform ${
										showFileDropdown ? "rotate-180" : ""
									}`}
								/>
							</button>
							{showFileDropdown && (
								<div className="absolute top-full right-0 mt-1 w-72 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
									<div className="p-2">
										{files.length > 0 ? (
											files.map((file) => (
												<div
													key={file.id}
													className={`w-full flex items-center px-2.5 py-2 hover:bg-blue-50 ${selectedFileId === file.id ? "bg-blue-50" : ""}`}
												>
													<button
														type="button"
														onClick={() => handleFileSelect(file.id)}
														className="grow flex items-center text-left"
													>
														<div className="shrink-0">
															{selectedFileId === file.id ? (
																<Check className="w-3.5 h-3.5 text-blue-600" />
															) : (
																<div className="w-3.5 h-3.5 border border-gray-400 rounded"></div>
															)}
														</div>
														<div className="ml-2 shrink-0">
															{getFileIcon(file.type)}
														</div>
														<div className="ml-2 flex-1 min-w-0">
															<div className="font-medium text-gray-900 truncate text-sm">
																{file.name}
															</div>
															<div className="text-xs text-gray-500 mt-0.5">
																{formatFileSize(file.size)} • {file.type}
															</div>
														</div>
													</button>
													<div
														className="ml-2 flex items-center"
														title="Set as Primary File"
													>
														<input
															type="radio"
															name="primaryFile"
															checked={
																primaryFileId === file.id ||
																(!primaryFileId && files[0].id === file.id)
															}
															onChange={() => setPrimaryFileId(file.id)}
															className="cursor-pointer"
														/>
														<span className="text-xs text-gray-500 ml-1">
															Primary
														</span>
													</div>
												</div>
											))
										) : (
											<div className="p-3 text-center text-gray-600 text-sm">
												No files uploaded.
											</div>
										)}
									</div>
								</div>
							)}
						</div>
						<button
							type="button"
							onClick={handleSubmit}
							disabled={uploading || files.length === 0}
							className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:bg-gray-400"
						>
							{uploading ? "Uploading..." : "Submit"}
						</button>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex flex-1 overflow-hidden">
				{/* Left Panel - Metadata Form */}
				<div className="w-1/2 overflow-y-auto p-6 border-r border-gray-300 bg-white">
					<div className="mx-auto">
						{selectedFile ? (
							<DynamicSubmissionForm />
							// <form
							// 	onSubmit={(e) => {
							// 		e.preventDefault();
							// 		handleSubmit();
							// 	}}
							// 	className="space-y-6"
							// >
							// 	{/* Form fields here - keeping it brief for the rest */}
							// 	<div>
							// 		<label
							// 			htmlFor="collection"
							// 			className="block text-sm font-medium text-gray-700"
							// 		>
							// 			Select Woreda *
							// 		</label>
							// 		<div className="relative mt-1" ref={collectionDropdownRef}>
							// 			<button
							// 				type="button"
							// 				onClick={() =>
							// 					setShowCollectionDropdown(!showCollectionDropdown)
							// 				}
							// 				className="w-full p-2 border border-gray-300 rounded-md bg-white text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
							// 			>
							// 				<span
							// 					className={
							// 						collectionId ? "text-gray-900" : "text-gray-500"
							// 					}
							// 				>
							// 					{collectionId
							// 						? collections.find((c) => c.uuid === collectionId)
							// 								?.name || "Select a collection"
							// 						: "Select a collection"}
							// 				</span>
							// 				<ChevronDown
							// 					className={`w-4 h-4 text-gray-500 transition-transform ${
							// 						showCollectionDropdown ? "rotate-180" : ""
							// 					}`}
							// 				/>
							// 			</button>
							// 			{showCollectionDropdown && (
							// 				<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg overflow-y-auto">
							// 					<div
							// 						onScroll={(e) => {
							// 							const { scrollTop, scrollHeight, clientHeight } =
							// 								e.target;
							// 							// Load more when scrolled to 80% of the list
							// 							if (
							// 								scrollHeight - scrollTop <=
							// 								clientHeight * 1.2
							// 							) {
							// 								loadMoreCollections();
							// 							}
							// 						}}
							// 						className="max-h-120 overflow-y-auto"
							// 					>
							// 						{collections.length > 0 ? (
							// 							collections.map((c) => (
							// 								<button
							// 									key={c.uuid}
							// 									type="button"
							// 									onClick={() => {
							// 										setCollectionId(c.uuid);
							// 										setShowCollectionDropdown(false);
							// 									}}
							// 									className={`w-full text-left px-3 py-2 hover:bg-blue-50 ${
							// 										collectionId === c.uuid
							// 											? "bg-blue-100 text-blue-900"
							// 											: "text-gray-900"
							// 									}`}
							// 								>
							// 									{c.name}
							// 								</button>
							// 							))
							// 						) : (
							// 							<div className="px-3 py-2 text-gray-500 text-sm">
							// 								{loadingCollections
							// 									? "Loading..."
							// 									: "No collections available"}
							// 							</div>
							// 						)}
							// 						{loadingCollections && collections.length > 0 && (
							// 							<div className="px-3 py-2 text-gray-500 text-sm text-center">
							// 								Loading more...
							// 							</div>
							// 						)}
							// 					</div>
							// 				</div>
							// 			)}
							// 		</div>
							// 	</div>

							// 	<div>
							// 		<label
							// 			htmlFor="houseNumber"
							// 			className="block text-sm font-medium text-gray-700"
							// 		>
							// 			House Number *
							// 		</label>
							// 		<input
							// 			id="houseNumber"
							// 			type="text"
							// 			value={houseNumber}
							// 			onChange={(e) => setHouseNumber(e.target.value)}
							// 			required
							// 			className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
							// 		/>
							// 	</div>

							// 	<div>
							// 		<label
							// 			htmlFor="husbandName"
							// 			className="block text-sm font-medium text-gray-700"
							// 		>
							// 			Husband Name *
							// 		</label>
							// 		<input
							// 			id="husbandName"
							// 			type="text"
							// 			value={husbandName}
							// 			onChange={(e) => setHusbandName(e.target.value)}
							// 			required
							// 			className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
							// 		/>
							// 	</div>

							// 	<div>
							// 		<label
							// 			htmlFor="wifeName"
							// 			className="block text-sm font-medium text-gray-700"
							// 		>
							// 			Wife Name *
							// 		</label>
							// 		<input
							// 			id="wifeName"
							// 			type="text"
							// 			value={wifeName}
							// 			onChange={(e) => setWifeName(e.target.value)}
							// 			required
							// 			className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
							// 		/>
							// 	</div>

							// 	<RepeatableField
							// 		label="Additional Family Head(s)"
							// 		values={additionalFamilyHeads}
							// 		setValues={setAdditionalFamilyHeads}
							// 		placeholder="Enter additional family head name"
							// 	/>

							// 	<div>
							// 		<label
							// 			htmlFor="nationalID"
							// 			className="block text-sm font-medium text-gray-700 mb-1"
							// 		>
							// 			Family Head National ID
							// 		</label>
							// 		<input
							// 			id="nationalID"
							// 			type="text"
							// 			value={nationalID}
							// 			onChange={(e) => setNationalID(e.target.value)}
							// 			autoComplete="off"
							// 			className="grow p-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							// 		/>
							// 	</div>

							// 	<div>
							// 		<label
							// 			htmlFor="registrationDate"
							// 			className="block text-sm font-medium text-gray-700"
							// 		>
							// 			Registration Date
							// 		</label>
							// 		<input
							// 			id="registrationDate"
							// 			type="date"
							// 			value={dateOfRegistration}
							// 			onChange={(e) => setDateOfRegistration(e.target.value)}
							// 			required
							// 			className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
							// 		/>
							// 	</div>

							// 	<div>
							// 		<label
							// 			htmlFor="familyCount"
							// 			className="block text-sm font-medium text-gray-700"
							// 		>
							// 			Family Count
							// 		</label>
							// 		<input
							// 			id="familyCount"
							// 			type="number"
							// 			value={familyCount}
							// 			onChange={(e) => setFamilyCount(e.target.value)}
							// 			autoComplete="off"
							// 			className="grow p-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							// 		/>
							// 	</div>

							// 	<div>
							// 		<label
							// 			htmlFor="familySummary"
							// 			className="block text-sm font-medium text-gray-700"
							// 		>
							// 			Family Summary
							// 		</label>
							// 		<textarea
							// 			id="familySummary"
							// 			value={familySummary}
							// 			onChange={(e) => setFamilySummary(e.target.value)}
							// 			rows="3"
							// 			className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
							// 		></textarea>
							// 	</div>

							// 	<div>
							// 		<label
							// 			htmlFor="identifiers"
							// 			className="block text-sm font-medium text-gray-700 mb-1"
							// 		>
							// 			Identifiers
							// 		</label>
							// 		<div id="identifiers">
							// 			{identifiers.map((id, index) => (
							// 				<div key={index} className="flex space-x-2 mb-2">
							// 					<select
							// 						value={id.type}
							// 						onChange={(e) =>
							// 							handleIdentifierChange(
							// 								index,
							// 								"type",
							// 								e.target.value,
							// 							)
							// 						}
							// 						className="p-2 border border-gray-300 rounded-sm bg-white"
							// 					>
							// 						{identifierOptions
							// 							.filter(
							// 								(t) =>
							// 									t === "Other" ||
							// 									t === id.type ||
							// 									!identifiers.some((i) => i.type === t),
							// 							)
							// 							.map((t) => (
							// 								<option key={t} value={t}>
							// 									{t}
							// 								</option>
							// 							))}
							// 					</select>
							// 					<input
							// 						type="text"
							// 						placeholder="Enter identifier"
							// 						value={id.value}
							// 						onChange={(e) =>
							// 							handleIdentifierChange(
							// 								index,
							// 								"value",
							// 								e.target.value,
							// 							)
							// 						}
							// 						autoComplete="off"
							// 						className="grow p-2 border border-gray-300 rounded-sm"
							// 					/>
							// 					<button
							// 						type="button"
							// 						onClick={() => removeIdentifier(index)}
							// 						className="text-red-400 hover:text-red-700 cursor-pointer"
							// 					>
							// 						<Trash2 size={18} />
							// 					</button>
							// 				</div>
							// 			))}
							// 		</div>
							// 		<button
							// 			type="button"
							// 			onClick={addIdentifier}
							// 			className="flex items-center text-sm text-blue-900 hover:text-blue-800"
							// 		>
							// 			<PlusCircleIcon size={16} className="mr-1" /> Add Identifier
							// 		</button>
							// 	</div>

							// 	{/* File List Section */}
							// 	<div>
							// 		<label
							// 			htmlFor="file-input"
							// 			className="block text-sm font-medium text-gray-700 mb-2"
							// 		>
							// 			Primary file
							// 		</label>
							// 		<div id="file-input">
							// 			{files.length > 0 ? (
							// 				<div className="space-y-2">
							// 					{files.map((file) => (
							// 						<div
							// 							key={file.id}
							// 							className="flex items-center justify-between p-2 bg-white rounded"
							// 						>
							// 							<div className="flex items-center overflow-hidden">
							// 								<div className="mr-2 text-gray-500">
							// 									{getFileIcon(file.type)}
							// 								</div>
							// 								<span
							// 									className="text-sm truncate max-w-[150px]"
							// 									title={file.name}
							// 								>
							// 									{file.name}
							// 								</span>
							// 							</div>
							// 							<div className="flex items-center ml-2">
							// 								<label className="inline-flex items-center cursor-pointer">
							// 									<input
							// 										type="radio"
							// 										name="primaryFile"
							// 										checked={
							// 											primaryFileId === file.id ||
							// 											(!primaryFileId && files[0].id === file.id)
							// 										}
							// 										onChange={() => setPrimaryFileId(file.id)}
							// 										className="form-radio h-4 w-4 text-blue-600 border-gray-300"
							// 									/>
							// 									<span className="ml-1 text-xs text-gray-600">
							// 										Primary
							// 									</span>
							// 								</label>
							// 								<button
							// 									type="button"
							// 									onClick={() => {
							// 										if (
							// 											window.confirm(
							// 												"Are you sure you want to remove this file?",
							// 											)
							// 										) {
							// 											const newFiles = files.filter(
							// 												(f) => f.id !== file.id,
							// 											);
							// 											setFiles(newFiles);
							// 											if (selectedFileId === file.id)
							// 												setSelectedFileId(null);
							// 										}
							// 									}}
							// 									className="ml-2 text-red-400 hover:text-red-600 cursor-pointer"
							// 								>
							// 									<Trash2 size={14} />
							// 								</button>
							// 							</div>
							// 						</div>
							// 					))}
							// 				</div>
							// 			) : (
							// 				<p className="text-sm text-gray-500 italic">
							// 					No files selected.
							// 				</p>
							// 			)}
							// 		</div>
							// 	</div>
							// </form>
						) : (
							<div className="text-center text-gray-500 pt-16">
								<FileText size={48} className="mx-auto mb-4" />
								<h3 className="text-lg font-semibold">No file selected</h3>
								<p>Please upload a file and select it to edit metadata.</p>
							</div>
						)}
					</div>
				</div>

				{/* Right Panel - File Preview */}
				<div className="w-1/2 overflow-hidden bg-gray-100">
					<div className="h-full flex flex-col">
						{selectedFile ? (
							<>
								{selectedFile.type === "application/pdf" && numPages && (
									<div className="bg-gray-200 p-2 flex items-center justify-center space-x-4 border-b border-gray-300">
										<button
											type="button"
											onClick={() => changePage(-1)}
											disabled={pageNumber <= 1}
											className="px-2 py-1 bg-gray-300 rounded disabled:opacity-50 cursor-pointer"
										>
											<ChevronLeft size={18} />
										</button>
										<span>
											Page {pageNumber} of {numPages}
										</span>
										<button
											type="button"
											onClick={() => changePage(1)}
											disabled={pageNumber >= numPages}
											className="px-2 py-1 bg-gray-300 rounded disabled:opacity-50 cursor-pointer"
										>
											<RightIcon size={18} />
										</button>
										<button
											type="button"
											onClick={zoomOut}
											className="px-2 py-1 bg-gray-300 rounded cursor-pointer"
										>
											<ZoomOut size={18} />
										</button>
										<span>{Math.round(scale * 100)}%</span>
										<button
											type="button"
											onClick={zoomIn}
											className="px-2 py-1 bg-gray-300 rounded cursor-pointer"
										>
											<ZoomIn size={18} />
										</button>

										<div className="h-6 w-px bg-gray-400 mx-2"></div>

										<div className="relative">
											<button
												type="button"
												onClick={handleMergeClick}
												className="p-1.5 hover:bg-gray-300 rounded cursor-pointer"
												title="Merge with another file"
											>
												<Merge size={18} />
											</button>
											{isMergeModalOpen && (
												<div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-xl z-50">
													<div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
														<h3 className="text-sm font-semibold text-gray-800">
															Merge Files
														</h3>
														<button
															type="button"
															onClick={() => setIsMergeModalOpen(false)}
															className="text-gray-400 hover:text-gray-600 cursor-pointer"
														>
															<X size={16} />
														</button>
													</div>
													<div className="p-3">
														<div className="space-y-3">
															<div>
																<div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto">
																	{files
																		.filter((f) => f.type === "application/pdf")
																		.map((file) => (
																			<label
																				key={file.id}
																				className="flex items-center p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 border-gray-100 transition-colors"
																			>
																				<input
																					type="checkbox"
																					checked={filesToMerge.includes(
																						file.id,
																					)}
																					onChange={() =>
																						toggleFileForMerge(file.id)
																					}
																					className="h-3.5 w-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
																				/>
																				<span className="ml-2.5 text-xs text-gray-700 truncate select-none">
																					{file.name}
																				</span>
																			</label>
																		))}
																</div>
																<p className="text-[10px] text-gray-400 mt-1 text-right">
																	{filesToMerge.length} files selected
																</p>
															</div>

															<div>
																<input
																	type="text"
																	value={mergeFileName}
																	onChange={(e) =>
																		setMergeFileName(e.target.value)
																	}
																	className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
																	placeholder="merged_filename.pdf"
																/>
															</div>
														</div>
													</div>
													<div className="p-2 bg-gray-50 rounded-b-lg flex justify-end space-x-2">
														<button
															type="button"
															onClick={handleMergeSubmit}
															className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm focus:outline-none disabled:opacity-50 transition-colors"
															disabled={filesToMerge.length < 2}
														>
															Merge Files
														</button>
													</div>
												</div>
											)}
										</div>

										<div className="relative">
											<button
												type="button"
												onClick={handleSplit}
												className="p-1.5 hover:bg-gray-300 rounded cursor-pointer"
												title="Split at this page"
											>
												<Scissors size={18} />
											</button>
											{isSplitModalOpen && (
												<div className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-300 rounded-lg shadow-xl z-50 p-4">
													<div className="flex justify-between items-center mb-3">
														<h3 className="text-sm font-semibold text-gray-800">
															Split PDF
														</h3>
														<button
															type="button"
															onClick={() => setIsSplitModalOpen(false)}
															className="text-gray-400 hover:text-gray-600 cursor-pointer"
														>
															<X size={16} />
														</button>
													</div>

													<div className="space-y-4">
														<div>
															<label
																htmlFor="splitPages"
																className="block text-xs font-medium text-gray-700 mb-1"
															>
																Split at Pages (comma separated)
															</label>
															<input
																id="splitPages"
																type="text"
																value={splitPages}
																onChange={(e) => setSplitPages(e.target.value)}
																placeholder="e.g. 2, 5"
																className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
															/>
															<p className="text-[10px] text-gray-500 mt-1">
																Splits occur after the specified page numbers.
																Example: "2, 5" creates 3 files (Pages 1-2, 3-5,
																6-End).
															</p>
														</div>

														<div className="border-t border-gray-100 pt-2">
															<h4 className="text-xs font-semibold text-gray-600 mb-2">
																Output Filenames
															</h4>
															<div className="space-y-2 max-h-40 overflow-y-auto pr-1">
																{splitNames.map((name, idx) => (
																	<div key={crypto.randomUUID()}>
																		<label
																			htmlFor={`splitName-${idx}`}
																			className="block text-[10px] text-gray-500 mb-0.5"
																		>
																			Part {idx + 1}
																		</label>
																		<input
																			id={`splitName-${idx}`}
																			type="text"
																			value={name}
																			onChange={(e) =>
																				handleSplitNameChange(
																					idx,
																					e.target.value,
																				)
																			}
																			className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
																			placeholder={`Filename for part ${idx + 1}`}
																		/>
																	</div>
																))}
															</div>
														</div>

														<div className="pt-2 flex justify-end">
															<button
																type="button"
																onClick={handleSplitSubmit}
																disabled={
																	splitNames.some((n) => !n.trim()) ||
																	!splitPages
																}
																className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50"
															>
																Split Files
															</button>
														</div>
													</div>
												</div>
											)}
										</div>

										<div className="relative">
											<button
												type="button"
												onClick={handleRename}
												className="p-1.5 hover:bg-gray-300 rounded cursor-pointer"
												title="Rename"
											>
												<Pencil size={18} />
											</button>
											{isRenameModalOpen && (
												<div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-xl z-50 p-4">
													<div className="flex justify-between items-center mb-3">
														<h3 className="text-sm font-semibold text-gray-800">
															Rename File
														</h3>
														<button
															type="button"
															onClick={() => setIsRenameModalOpen(false)}
															className="text-gray-400 hover:text-gray-600 cursor-pointer"
														>
															<X size={16} />
														</button>
													</div>
													<div className="mb-3">
														<label
															htmlFor="renameNewName"
															className="block text-xs font-medium text-gray-700 mb-1"
														>
															New Filename
														</label>
														<input
															id="renameNewName"
															type="text"
															value={renameNewName}
															onChange={(e) => setRenameNewName(e.target.value)}
															className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
															placeholder="Enter new filename"
														/>
													</div>
													<div className="flex justify-end">
														<button
															type="button"
															onClick={handleRenameSubmit}
															disabled={!renameNewName.trim()}
															className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50"
														>
															Rename
														</button>
													</div>
												</div>
											)}
										</div>

										<button
											type="button"
											onClick={() => handleRotate(90)}
											className="p-1.5 hover:bg-gray-300 rounded cursor-pointer"
											title="Rotate Page 90°"
										>
											<RotateCw size={18} />
										</button>
									</div>
								)}
								<div className="flex-1 overflow-auto p-4">
									{selectedFile.type === "application/pdf" ? (
										<Document
											key={selectedFile.id}
											file={selectedFile.fileUrl}
											onLoadSuccess={onDocumentLoadSuccess}
											onLoadError={onDocumentLoadError}
											error={pdfError && <div>{pdfError}</div>}
											loading="Loading PDF..."
										>
											<Page pageNumber={pageNumber} scale={scale} />
										</Document>
									) : selectedFile.type.startsWith("image/") ? (
										<img
											src={selectedFile.fileUrl}
											alt={selectedFile.name}
											className="max-w-full max-h-full object-contain"
										/>
									) : (
										<div className="text-center text-gray-500 pt-16">
											Unsupported file type for preview.
										</div>
									)}
								</div>
							</>
						) : (
							<div className="h-full flex flex-col items-center justify-center text-gray-500">
								<Eye size={48} className="mb-4" />
								<h3 className="text-lg font-semibold">Preview</h3>
								<p>Select a file to preview.</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default MetadataEditor;
