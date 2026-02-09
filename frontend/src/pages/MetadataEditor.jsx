import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
    FileText,
    Image,
    File,
    Upload,
    Eye,
    ChevronLeft,
    ChevronRight as RightIcon,
    ZoomIn,
    ZoomOut,
    ChevronDown,
    Check,
    PlusCircle,
    Trash2,
} from "lucide-react";
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
            {values.map((value, index) => (
                <div key={index} className="flex items-center mb-2">
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => updateField(index, e.target.value)}
                        placeholder={placeholder}
                        className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="ml-2 text-red-600 hover:text-red-800"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            ))}
            <button
                type="button"
                onClick={addField}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
                <PlusCircle size={16} className="mr-1" />
                Add {label}
            </button>
        </div>
    );
};

const MetadataEditor = () => {
    const [files, setFiles] = useState([]);
    const [selectedFileId, setSelectedFileId] = useState(null);

    // Form state
    const [collections, setCollections] = useState([]);
    const [collectionId, setCollectionId] = useState("");
    const [authors, setAuthors] = useState([""]);
    const [title, setTitle] = useState("");
    const [otherTitles, setOtherTitles] = useState([""]);
    const [dateOfIssue, setDateOfIssue] = useState("");
    const [publisher, setPublisher] = useState("");
    // const [citation, setCitation] = useState("");
    // const [seriesReportNo, setSeriesReportNo] = useState([""]);
    // const [accessionNumber, setAccessionNumber] = useState("");
    const [publicationDate, setPublicationDate] = useState("");
    // const [identifiers, setIdentifiers] = useState([{ type: "ISSN", value: "" }]);
    const [type, setType] = useState("");
    const [language, setLanguage] = useState("en_US");
    const [subjectKeywords, setSubjectKeywords] = useState([""]);
    const [abstractText, setAbstractText] = useState("");
    const [sponsors, setSponsors] = useState("");
    const [description, setDescription] = useState("");

    // New Legal/Case fields
    const [benchSession, setBenchSession] = useState("");
    const [complaintNumber, setComplaintNumber] = useState("");
    const [fileNumber, setFileNumber] = useState("");
    const [documentType, setDocumentType] = useState("");
    const [judgeNumber, setJudgeNumber] = useState("");
    const [location, setLocation] = useState("");
    const [caseLevel, setCaseLevel] = useState("");
    const [caseType, setCaseType] = useState("");

    const [confirmLicense, setConfirmLicense] = useState(false);

    // PDF viewer states
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [pdfError, setPdfError] = useState(null);

    const [uploading, setUploading] = useState(false);
    const [showFileDropdown, setShowFileDropdown] = useState(false);

    useEffect(() => {
        const fetchDspaceCollections = async () => {
            try {
                const fetchedCollections = await dspaceService.getCollections();
                setCollections(fetchedCollections);
            } catch (error) {
                console.error("Failed to fetch DSpace collections:", error);
            }
        };
        fetchDspaceCollections();
    }, []);

    const selectedFile = files.find((f) => f.id === selectedFileId);

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
            label: "",
        }));

        const updatedFiles = [...files, ...newFileItems];
        setFiles(updatedFiles);

        if (newFileItems.length > 0 && !selectedFileId) {
            handleFileSelect(newFileItems[0].id);
        }

        event.target.value = "";
    };

    const handleFileSelect = (fileId) => {
        setSelectedFileId(fileId);
        const file = files.find((f) => f.id === fileId);
        if (file) {
            setTitle(file.name); // Default title to filename
        }
        setShowFileDropdown(false);
        setPageNumber(1);
        setNumPages(null);
        setPdfError(null);
    };

    const [primaryFileId, setPrimaryFileId] = useState(null);

    const handleFinalUpload = async () => {
        if (uploading || files.length === 0) {
            alert("Please select files to upload.");
            return;
        }

        if (
            !title ||
            !dateOfIssue ||
            !type ||
            !confirmLicense ||
            !collectionId
        ) {
            alert(
                "Please fill all mandatory fields: Title, Date of Issue, Type, Collection, and confirm the license."
            );
            return;
        }

        // Judge Number validation (1-9)
        if (judgeNumber && (isNaN(judgeNumber) || parseInt(judgeNumber) < 1 || parseInt(judgeNumber) > 9)) {
            alert("Judge Number must be a number between 1 and 9.");
            setUploading(false);
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
            const workspaceItem = await dspaceService.createWorkspaceItem(collectionId);
            const workspaceItemId = workspaceItem.id;

            // 2. Update metadata
            const metadata = {
                title: title,
                author: authors.filter(a => a.trim()),
                otherTitles: otherTitles.filter(t => t.trim()),
                description: description,
                subjectKeywords: subjectKeywords.filter(k => k.trim()),
                type: type,
                language: language,
                // reportNo: accessionNumber,
                sponsors: sponsors,
                dateIssued: dateOfIssue,
                publisher: publisher,
                // citation: citation,
                // series: seriesReportNo.filter(s => s.trim()),
                abstract: abstractText,
                // Legal/Case fields
                benchSession,
                complaintNumber,
                fileNumber,
                documentType,
                judgeNumber,
                location,
                caseLevel,
                caseType,
            };

            await dspaceService.updateMetadata(workspaceItemId, metadata);
            // If we're here, metadata update succeeded because it would have thrown otherwise

            // 3. Upload files
            // Sort files so Primary is first (if selected), otherwise keeping order
            const filesToUpload = [...files].sort((a, b) => {
                if (a.id === primaryFileId) return -1;
                if (b.id === primaryFileId) return 1;
                return 0;
            });

            for (const fileItem of filesToUpload) {
                const bitstream = await dspaceService.uploadFile(workspaceItemId, fileItem.fileObject);
                if (bitstream && bitstream.uuid) {
                    if (fileItem.label && fileItem.label.trim()) {
                        await dspaceService.updateBitstreamMetadata(bitstream.uuid, fileItem.label.trim());
                    }
                } else {
                    console.error(`Failed to upload file: ${fileItem.name}`);
                }
            }

            // 4. Accept license
            await dspaceService.acceptWorkspaceLicense(workspaceItemId);

            // 5. Submit to workflow
            await dspaceService.submitWorkspaceItem(workspaceItem);

            alert("Upload successful! Item submitted to workflow.");

            // Reset form
            setFiles([]);
            setPrimaryFileId(null);
            setSelectedFileId(null);
            setTitle("");
            setAuthors([""]);
            setDescription("");
            setSubjectKeywords([""]);
            setAbstractText("");
            setPublisher("");
            // setCitation("");
            // setAccessionNumber("");
            // setSeriesReportNo([""]);
            setSponsors("");
            setDateOfIssue("");
            setBenchSession("");
            setComplaintNumber("");
            setFileNumber("");
            setDocumentType("");
            setJudgeNumber("");
            setLocation("");
            setCaseLevel("");
            setCaseType("");
            setConfirmLicense(false);
        } catch (e) {
            console.error("Critical upload error:", e);
            alert(`Upload failed: ${e.message}`);
        } finally {
            setUploading(false);
        }
    };

    const getFileIcon = (type) => {
        if (type.startsWith("image/")) return <Image className="w-4 h-4" />;
        if (type.includes("pdf")) return <FileText className="w-4 h-4" />;
        return <File className="w-4 h-4" />;
    };
    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };
    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setPageNumber(1);
        setPdfError(null);
    };
    const onDocumentLoadError = (error) => setPdfError("Failed to load PDF.");
    const changePage = (offset) =>
        setPageNumber((prev) => Math.min(Math.max(prev + offset, 1), numPages));
    const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0));
    const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

    /* const handleIdentifierChange = (index, field, value) => {
        const newIdentifiers = [...identifiers];
        newIdentifiers[index][field] = value;
        setIdentifiers(newIdentifiers);
    };
    const addIdentifier = () =>
        setIdentifiers([...identifiers, { type: "ISSN", value: "" }]);
    const removeIdentifier = (index) =>
        setIdentifiers(identifiers.filter((_, i) => i !== index)); */

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
                                onClick={() => setShowFileDropdown(!showFileDropdown)}
                                className="flex items-center px-3 py-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-sm"
                            >
                                <Eye className="w-3 h-3 mr-1.5 text-gray-600" />
                                <span className="text-gray-700">
                                    {selectedFile ? selectedFile.name : "Select File"}
                                </span>
                                <ChevronDown
                                    className={`w-3 h-3 ml-1.5 text-gray-500 transition-transform ${showFileDropdown ? "rotate-180" : ""
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
                                                        onClick={() => handleFileSelect(file.id)}
                                                        className="flex-grow flex items-center text-left"
                                                    >
                                                        <div className="flex-shrink-0">
                                                            {selectedFileId === file.id ? (
                                                                <Check className="w-3.5 h-3.5 text-blue-600" />
                                                            ) : (
                                                                <div className="w-3.5 h-3.5 border border-gray-400 rounded"></div>
                                                            )}
                                                        </div>
                                                        <div className="ml-2 flex-shrink-0">
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
                                                    <div className="ml-2 flex items-center" title="Set as Primary File">
                                                        <input
                                                            type="radio"
                                                            name="primaryFile"
                                                            checked={primaryFileId === file.id || (!primaryFileId && files[0].id === file.id)}
                                                            onChange={() => setPrimaryFileId(file.id)}
                                                            className="cursor-pointer"
                                                        />
                                                        <span className="text-xs text-gray-500 ml-1">Primary</span>
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
                            onClick={handleFinalUpload}
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
                    <div className="max-w-2xl mx-auto">
                        {selectedFile ? (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleFinalUpload();
                                }}
                                className="space-y-6"
                            >
                                {/* Form fields here - keeping it brief for the rest */}
                                <div>
                                    <label
                                        htmlFor="collection"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Select Collection *
                                    </label>
                                    <select
                                        id="collection"
                                        value={collectionId}
                                        onChange={(e) => setCollectionId(e.target.value)}
                                        required
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="" disabled>
                                            Select a collection
                                        </option>
                                        {collections.map((c) => (
                                            <option key={c.uuid} value={c.uuid}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>


                                <RepeatableField
                                    label="Author(s)"
                                    values={authors}
                                    setValues={setAuthors}
                                    placeholder="Enter author name"
                                />
                                <div>
                                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title *</label>
                                    <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                </div>
                                <RepeatableField label="Other Titles" values={otherTitles} setValues={setOtherTitles} placeholder="Enter other title" />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Date of Issue *</label>
                                    <input type="date" value={dateOfIssue} onChange={(e) => setDateOfIssue(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                </div>
                                <div>
                                    <label htmlFor="publisher" className="block text-sm font-medium text-gray-700">Publisher</label>
                                    <input id="publisher" type="text" value={publisher} onChange={(e) => setPublisher(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                </div>

                                { /* <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Accession Number / Barcode</label>
                                    <input type="text" value={accessionNumber} onChange={(e) => setAccessionNumber(e.target.value)} placeholder="Enter accession number or barcode" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                </div> */ }
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Publication Date</label>
                                    <input type="date" value={publicationDate} onChange={(e) => setPublicationDate(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                </div>

                                <div>
                                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type *</label>
                                    <select id="type" value={type} onChange={(e) => setType(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                        <option value="" disabled>Select a type</option>
                                        {["Article", "Learning Object", "Legal Case", "Image", "Image, 3-D", "Musical Score", "Plan or blueprint", "Preprint", "Presentation", "Recording acoustical", "Recording musical", "Recording oral", "Technical Report", "Thesis", "Video", "Working Paper"].map((t) => (<option key={t} value={t}>{t}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="language" className="block text-sm font-medium text-gray-700">Language</label>
                                    <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                        {[{ label: "English (United States)", value: "en_US" }, { label: "English", value: "en" }, { label: "Spanish", value: "es" }, { label: "Italian", value: "it" }, { label: "Chinese", value: "zh" }, { label: "Turkish", value: "tr" }].map((l) => (<option key={l.value} value={l.value}>{l.label}</option>))}
                                    </select>
                                </div>
                                <RepeatableField label="Subject Keywords" values={subjectKeywords} setValues={setSubjectKeywords} placeholder="Enter keyword" />
                                <div>
                                    <label htmlFor="abstract" className="block text-sm font-medium text-gray-700">Abstract</label>
                                    <textarea id="abstract" value={abstractText} onChange={(e) => setAbstractText(e.target.value)} rows="3" className="mt-1 block w-full p-2 border border-gray-300 rounded-md"></textarea>
                                </div>
                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                                    <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="mt-1 block w-full p-2 border border-gray-300 rounded-md"></textarea>
                                </div>
                                <div>
                                    <label htmlFor="sponsors" className="block text-sm font-medium text-gray-700">Sponsors</label>
                                    <textarea id="sponsors" value={sponsors} onChange={(e) => setSponsors(e.target.value)} rows="2" placeholder="Enter sponsor details (optional)" className="mt-1 block w-full p-2 border border-gray-300 rounded-md"></textarea>
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                    <h3 className="text-md font-semibold text-gray-800 mb-4">Legal & Case Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="benchSession" className="block text-sm font-medium text-gray-700">Bench Session</label>
                                            <input id="benchSession" type="text" value={benchSession} onChange={(e) => setBenchSession(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                                            <input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label htmlFor="complaintNumber" className="block text-sm font-medium text-gray-700">Complaint Number</label>
                                            <input id="complaintNumber" type="text" value={complaintNumber} onChange={(e) => setComplaintNumber(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label htmlFor="fileNumber" className="block text-sm font-medium text-gray-700">File Number</label>
                                            <input id="fileNumber" type="text" value={fileNumber} onChange={(e) => setFileNumber(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label htmlFor="documentType" className="block text-sm font-medium text-gray-700">Document Type</label>
                                            <input id="documentType" type="text" value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label htmlFor="judgeNumber" className="block text-sm font-medium text-gray-700">Judge Number</label>
                                            <input id="judgeNumber" type="text" value={judgeNumber} onChange={(e) => setJudgeNumber(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                        </div>
                                        <div>
                                            <label htmlFor="caseLevel" className="block text-sm font-medium text-gray-700">Case Level</label>
                                            <select
                                                id="caseLevel"
                                                value={caseLevel}
                                                onChange={(e) => setCaseLevel(e.target.value)}
                                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                                            >
                                                <option value="">Select Level</option>
                                                {["Registrar", "Screening", "Litigation", "Archive"].map(l => (
                                                    <option key={l} value={l}>{l}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="caseType" className="block text-sm font-medium text-gray-700">Case Type</label>
                                            <select
                                                id="caseType"
                                                value={caseType}
                                                onChange={(e) => setCaseType(e.target.value)}
                                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                                            >
                                                <option value="">Select Type</option>
                                                {["Civil", "Criminal", "Cassation"].map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* File List Section */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary file</label>
                                    {files.length > 0 ? (
                                        <div className="space-y-2">
                                            {files.map((file) => (
                                                <div key={file.id} className="flex items-center justify-between p-2 bg-white rounded">
                                                    <div className="flex items-center overflow-hidden">
                                                        <div className="mr-2 text-gray-500">{getFileIcon(file.type)}</div>
                                                        <span className="text-sm truncate max-w-[150px]" title={file.name}>{file.name}</span>
                                                    </div>
                                                    <div className="flex items-center ml-2 space-x-2">
                                                        <select
                                                            value={file.label}
                                                            onChange={(e) => {
                                                                const newFiles = [...files];
                                                                const idx = newFiles.findIndex(f => f.id === file.id);
                                                                if (idx !== -1) {
                                                                    newFiles[idx].label = e.target.value;
                                                                    setFiles(newFiles);
                                                                }
                                                            }}
                                                            className="text-xs p-1 border border-gray-300 rounded w-40 flex-shrink-0"
                                                        >
                                                            <option value="">Select Category</option>
                                                            {["Pleadings", "Orders & Minutes", "Evidence", "Administrative"].map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                        <label className="inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="primaryFile"
                                                                checked={primaryFileId === file.id || (!primaryFileId && files[0].id === file.id)}
                                                                onChange={() => setPrimaryFileId(file.id)}
                                                                className="form-radio h-4 w-4 text-blue-600 border-gray-300"
                                                            />
                                                            <span className="ml-1 text-xs text-gray-600 font-medium">Primary</span>
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (window.confirm("Are you sure you want to remove this file?")) {
                                                                    const newFiles = files.filter(f => f.id !== file.id);
                                                                    setFiles(newFiles);
                                                                    if (selectedFileId === file.id) setSelectedFileId(null);
                                                                }
                                                            }}
                                                            className="ml-1 text-red-500 hover:text-red-700"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No files selected.</p>
                                    )}
                                </div>

                                <div className="flex items-center">
                                    <input id="license" type="checkbox" checked={confirmLicense} onChange={(e) => setConfirmLicense(e.target.checked)} required className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                                    <label htmlFor="license" className="ml-2 block text-sm text-gray-900">I confirm the license above</label>
                                </div>
                            </form>
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
                                        <button onClick={() => changePage(-1)} disabled={pageNumber <= 1} className="px-2 py-1 bg-gray-300 rounded disabled:opacity-50"><ChevronLeft size={18} /></button>
                                        <span>Page {pageNumber} of {numPages}</span>
                                        <button onClick={() => changePage(1)} disabled={pageNumber >= numPages} className="px-2 py-1 bg-gray-300 rounded disabled:opacity-50"><RightIcon size={18} /></button>
                                        <button onClick={zoomOut} className="px-2 py-1 bg-gray-300 rounded"><ZoomOut size={18} /></button>
                                        <span>{Math.round(scale * 100)}%</span>
                                        <button onClick={zoomIn} className="px-2 py-1 bg-gray-300 rounded"><ZoomIn size={18} /></button>
                                    </div>
                                )}
                                <div className="flex-1 overflow-auto p-4">
                                    {selectedFile.type === "application/pdf" ? (
                                        <Document file={selectedFile.fileUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError} error={pdfError && <div>{pdfError}</div>} loading="Loading PDF...">
                                            <Page pageNumber={pageNumber} scale={scale} />
                                        </Document>
                                    ) : selectedFile.type.startsWith("image/") ? (
                                        <img src={selectedFile.fileUrl} alt={selectedFile.name} className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <div className="text-center text-gray-500 pt-16">Unsupported file type for preview.</div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500"><Eye size={48} className="mb-4" /><h3 className="text-lg font-semibold">Preview</h3><p>Select a file to preview.</p></div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MetadataEditor;
