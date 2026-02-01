import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
    FileText,
    Image,
    File as FileIcon,
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
    RotateCw,
    Scissors,
    Merge,
    Pencil,
    X,
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
                        autoComplete="off"
                        className="flex-grow p-2 border border-gray-300 rounded-sm focus:ring-blue-500 focus:border-blue-500"
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
            <button
                type="button"
                onClick={addField}
                className="flex items-center text-sm text-blue-900 hover:text-blue-800"
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
    const selectedFile = files.find((f) => f.id === selectedFileId);

    // Form state
    const [collections, setCollections] = useState([]);
    const [collectionId, setCollectionId] = useState("");
    const [authors, setAuthors] = useState([""]);
    const [title, setTitle] = useState("");
    const [otherTitles, setOtherTitles] = useState([""]);
    const [dateOfIssue, setDateOfIssue] = useState("");
    const [publisher, setPublisher] = useState("");
    const [citation, setCitation] = useState("");
    const [seriesReportNo, setSeriesReportNo] = useState([""]);
    const [reportNumber, setReportNumber] = useState("");
    const [accessionNumber, setAccessionNumber] = useState("");
    const [publicationDate, setPublicationDate] = useState("");
    const [identifiers, setIdentifiers] = useState([{ type: "Other", value: "" }]);
    const [type, setType] = useState("");
    const [language, setLanguage] = useState("en_US");
    const [subjectKeywords, setSubjectKeywords] = useState([""]);
    const [abstractText, setAbstractText] = useState("");
    const [sponsors, setSponsors] = useState("");
    const [description, setDescription] = useState("");
    const [confirmLicense, setConfirmLicense] = useState(false);

    // PDF viewer states
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [pdfError, setPdfError] = useState(null);

    const [uploading, setUploading] = useState(false);
    const [showFileDropdown, setShowFileDropdown] = useState(false);
    // Removed mergeInputRef as it's no longer used for direct file input

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
        setFiles(prev => prev.map(f => {
            if (f.id === fileId) {
                return {
                    ...f,
                    fileObject: newFileObj,
                    fileUrl: newUrl,
                    size: newFileObj.size,
                    name: newName || f.name,
                    lastModified: new Date()
                };
            }
            return f;
        }));
        // If updating the selected file, force reload
        if (selectedFileId === fileId) {
            setPageNumber(1);
        }
    };

    const handleRotate = async (angle) => {
        if (!selectedFile) return;
        try {
            const formData = new FormData();
            formData.append('file', selectedFile.fileObject);
            formData.append('page', pageNumber);
            formData.append('angle', angle);

            const response = await fetch('/api/resources/pdf/rotate/', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const blob = await response.blob();
                const newFile = new File([blob], selectedFile.name, { type: 'application/pdf' });
                updateFileInList(selectedFile.id, newFile);
            } else {
                alert('Rotate failed');
            }
        } catch (error) {
            console.error(error);
            alert('Rotate error');
        }
    };

    const handleSplit = () => {
        if (!selectedFile) return;
        setIsMergeModalOpen(false);
        setIsRenameModalOpen(false);
        setSplitPages(String(pageNumber));
        const baseName = selectedFile.name.replace('.pdf', '');
        // Initial split assumes 1 split point -> 2 files.
        setSplitNames([`${baseName}_part1`, `${baseName}_part2`]);
        setIsSplitModalOpen(true);
    };

    // Recalculate name inputs when split pages change
    useEffect(() => {
        if (!isSplitModalOpen) return;

        const points = splitPages.split(',').filter(p => p.trim() !== "").length;
        const numParts = points + 1;

        setSplitNames(prev => {
            const newNames = [...prev];
            // Adjust length
            if (newNames.length < numParts) {
                // Add missing
                for (let i = newNames.length; i < numParts; i++) {
                    const baseName = selectedFile ? selectedFile.name.replace('.pdf', '') : 'file';
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
            formData.append('file', selectedFile.fileObject);
            formData.append('pages', splitPages);

            // Pass names as JSON string to handle list
            formData.append('names', JSON.stringify(splitNames));

            const response = await fetch('/api/resources/pdf/split/', {
                method: 'POST',
                body: formData
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
                            type: 'application/pdf',
                            size: blob.size,
                            lastModified: new Date(),
                            fileObject: new File([blob], fileData.name, { type: 'application/pdf' }),
                            // We create an object URL for the blob like other files
                            fileUrl: URL.createObjectURL(blob),
                        };
                        newFiles.push(newFileItem);
                    } catch (e) {
                        console.error("Failed to load split file", e);
                    }
                }

                setFiles(prev => [...prev, ...newFiles]);
                setIsSplitModalOpen(false);
                alert('Split successful! Files added to list.');

            } else {
                const err = await response.json();
                alert('Split failed: ' + (err.error || 'Unknown error'));
            }
        } catch (error) {
            console.error(error);
            alert('Split error');
        }
    };

    const handleRename = () => {
        if (!selectedFile) return;
        setIsMergeModalOpen(false);
        setIsSplitModalOpen(false);
        setRenameNewName(selectedFile.name.replace('.pdf', ''));
        setIsRenameModalOpen(true);
    };

    const handleRenameSubmit = async () => {
        if (!selectedFile || !renameNewName) return;

        try {
            const formData = new FormData();
            formData.append('file', selectedFile.fileObject);
            formData.append('title', renameNewName);

            const response = await fetch('/api/resources/pdf/rename/', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const contentDisposition = response.headers.get('Content-Disposition');
                let finalName = renameNewName;
                if (!finalName.toLowerCase().endsWith(".pdf")) finalName += ".pdf";

                const blob = await response.blob();
                const newFile = new File([blob], finalName, { type: 'application/pdf' });
                updateFileInList(selectedFile.id, newFile, finalName);
                setIsRenameModalOpen(false);
            } else {
                alert('Rename failed');
            }
        } catch (error) {
            console.error(error);
            alert('Rename error');
        }
    };

    // Initialize merge selection when modal opens
    useEffect(() => {
        if (isMergeModalOpen && selectedFile) {
            setFilesToMerge([selectedFile.id]);
            setMergeFileName(`merged_${selectedFile.name.replace('.pdf', '')}.pdf`);
        }
    }, [isMergeModalOpen, selectedFile]);


    const handleMergeClick = () => {
        if (!selectedFile) return;
        setIsSplitModalOpen(false);
        setIsRenameModalOpen(false);
        setIsMergeModalOpen(true);
    };

    const toggleFileForMerge = (fileId) => {
        setFilesToMerge(prev => {
            if (prev.includes(fileId)) {
                return prev.filter(id => id !== fileId);
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
                .map(id => files.find(f => f.id === id))
                .filter(Boolean);

            orderedFilesToMerge.forEach(file => {
                formData.append('files', file.fileObject);
            });

            const response = await fetch('/api/resources/pdf/merge/', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const blob = await response.blob();
                console.log("DEBUG: Merged blob size:", blob.size);
                let finalName = mergeFileName || "merged.pdf";
                if (!finalName.toLowerCase().endsWith(".pdf")) finalName += ".pdf";

                const newFile = new File([blob], finalName, { type: 'application/pdf' });

                // Add as new file to list
                const newFileItem = {
                    id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: finalName,
                    type: 'application/pdf',
                    size: newFile.size,
                    lastModified: new Date(),
                    fileObject: newFile,
                    fileUrl: URL.createObjectURL(newFile),
                };

                setFiles(prev => [...prev, newFileItem]);
                setIsMergeModalOpen(false);
                alert('Merged file added to list');

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
                alert('Merge failed');
            }
        } catch (error) {
            console.error(error);
            alert('Merge error');
        }
    };

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

    const handleFileSelect = (fileId, fileObj = null) => {
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
                type: type,
                language: language,
                reportNumber: reportNumber,
                series: seriesReportNo.filter(s => s.trim()),
                sponsors: sponsors,
                dateIssued: dateOfIssue,
                publisher: publisher,
                citation: citation,
                abstract: abstractText,
                identifiers: identifiers.filter(id => id.value && id.value.trim()),
            };

            const metaSuccess = await dspaceService.updateMetadata(workspaceItemId, metadata);
            if (!metaSuccess) {
                console.error("Metadata update failed, but proceeding with file upload...");
            }

            // 3. Upload files
            // Sort files so Primary is first (if selected), otherwise keeping order
            const filesToUpload = [...files].sort((a, b) => {
                if (a.id === primaryFileId) return -1;
                if (b.id === primaryFileId) return 1;
                return 0;
            });

            for (const fileItem of filesToUpload) {
                const uploadSuccess = await dspaceService.uploadFile(workspaceItemId, fileItem.fileObject);
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
            setFiles([]);
            setPrimaryFileId(null);
            setSelectedFileId(null);
            setTitle("");
            setAuthors([""]);
            setDescription("");
            setSubjectKeywords([""]);
            setAbstractText("");
            setPublisher("");
            setCitation("");
            setAccessionNumber("");
            setSeriesReportNo([""]);
            setSponsors("");
            setDateOfIssue("");
            setConfirmLicense(false);
        } catch (e) {
            console.error("Critical upload error:", e);
            alert("Upload failed: " + (e?.message || e));
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

    return (
        <div className="flex flex-col h-screen bg-white">
            <div className="flex h-16  z-10">
                {/* Left Header - Nav */}
                <div className="w-1/2 border-r border-gray-300 flex items-center bg-white">
                    <Link to="/" className="flex items-center text-blue-900  px-6 transition-colors h-full border-gray-200">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                </div>

                {/* Right Header - Actions */}
                <div className="w-1/2 flex items-center justify-between px-6 bg-white">
                    <div className="flex items-center space-x-3">
                        <label className="flex items-center px-4 py-2 bg-blue-900 text-white rounded-sm transition-all cursor-pointer text-xs font-bold ">
                            <Upload className="w-4 h-4 mr-2" />
                            UPLOAD NEW
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
                                className="flex items-center px-4 py-2 border border-blue-900/10 rounded-sm bg-blue-50/50 hover:bg-blue-50 transition-all text-xs font-bold cursor-pointer text-blue-900"
                            >
                            
                                <span>
                                    {selectedFile ? selectedFile.name : "VIEW FILES"}
                                </span>
                                <ChevronDown
                                    className={`w-4 h-4 ml-2 transition-transform ${showFileDropdown ? "rotate-180" : ""
                                        }`}
                                />
                            </button>
                            {showFileDropdown && (
                                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg z-50 max-h-96 overflow-y-auto overflow-x-hidden">
                                    <div className="p-2">
                                        {files.length > 0 ? (
                                            files.map((file) => (
                                                <div
                                                    key={file.id}
                                                    className={`w-full flex items-center px-3 py-2.5 hover:bg-blue-50 rounded-sm mb-1 transition-colors ${selectedFileId === file.id ? "bg-blue-50/80" : ""}`}
                                                >
                                                    <button
                                                        onClick={() => handleFileSelect(file.id)}
                                                        className="flex-grow flex items-center text-left"
                                                    >
                                                        <div className="flex-shrink-0">
                                                            {selectedFileId === file.id ? (
                                                                <Check className="w-4 h-4 text-blue-900" />
                                                            ) : (
                                                                <div className="w-4 h-4 border border-gray-300 rounded"></div>
                                                            )}
                                                        </div>
                                                        <div className="ml-3 flex-shrink-0 text-blue-900/60">
                                                            {getFileIcon(file.type)}
                                                        </div>
                                                        <div className="ml-3 flex-1 min-w-0">
                                                            <div className="font-semibold text-gray-900 truncate text-xs">
                                                                {file.name}
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 mt-0.5">
                                                                {formatFileSize(file.size)} • {file.type.split('/')[1]?.toUpperCase() || file.type}
                                                            </div>
                                                        </div>
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-gray-400 text-xs italic">
                                                No files uploaded yet.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleFinalUpload}
                        disabled={uploading || files.length === 0}
                        className="px-6 py-2 bg-blue-900 text-white rounded-sm cursor-pointer transition-all text-xs font-bold disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none uppercase tracking-wider"
                    >
                        {uploading ? "SUBMITTING..." : "SUBMIT ITEM"}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                <div className="w-1/2 overflow-y-auto bg-white border-r border-gray-300">
                    <div className="h-full max-w-2xl mx-auto px-6 py-8">
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
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-sm"
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
                                    <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                </div>
                                <RepeatableField label="Other Titles" values={otherTitles} setValues={setOtherTitles} placeholder="Enter other title" />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Date of Issue *</label>
                                    <input type="date" value={dateOfIssue} onChange={(e) => setDateOfIssue(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                </div>
                                <div>
                                    <label htmlFor="publisher" className="block text-sm font-medium text-gray-700">Publisher</label>
                                    <input id="publisher" type="text" value={publisher} onChange={(e) => setPublisher(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                </div>
                                <div>
                                    <label htmlFor="citation" className="block text-sm font-medium text-gray-700">Citation</label>
                                    <input id="citation" type="text" value={citation} onChange={(e) => setCitation(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                </div>
                                <RepeatableField label="Series/Report No." values={seriesReportNo} setValues={setSeriesReportNo} placeholder="Enter series/report number" />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Report No.</label>
                                    <input type="text" value={reportNumber} onChange={(e) => setReportNumber(e.target.value)} placeholder="Enter report number" autoComplete="off" className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Identifiers</label>
                                    {identifiers.map((id, index) => (
                                        <div key={index} className="flex space-x-2 mb-2">
                                            <select value={id.type} onChange={(e) => handleIdentifierChange(index, "type", e.target.value)} className="p-2 border border-gray-300 rounded-sm bg-white">
                                                {["Other", "ISSN", "ISMN", "Gov't Doc #", "URI", "ISBN"].map((t) => (<option key={t} value={t}>{t}</option>))}
                                            </select>
                                            <input type="text" placeholder="Enter identifier" value={id.value} onChange={(e) => handleIdentifierChange(index, "value", e.target.value)} autoComplete="off" className="flex-grow p-2 border border-gray-300 rounded-sm" />
                                            <button type="button" onClick={() => removeIdentifier(index)} className="text-red-400 hover:text-red-700 cursor-pointer"><Trash2 size={18} /></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addIdentifier} className="flex items-center text-sm text-blue-900 hover:text-blue-800"><PlusCircle size={16} className="mr-1" /> Add Identifier</button>
                                </div>
                                <div>
                                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type *</label>
                                    <select id="type" value={type} onChange={(e) => setType(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-sm">
                                        <option value="" disabled>Select a type</option>
                                        {["Animation", "Article", "Learning Object", "Image", "Image, 3-D", "Musical Score", "Plan or blueprint", "Preprint", "Presentation", "Recording acoustical", "Recording musical", "Recording oral", "Technical Report", "Thesis", "Video", "Working Paper"].map((t) => (<option key={t} value={t}>{t}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="language" className="block text-sm font-medium text-gray-700">Language</label>
                                    <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm">
                                        {[{ label: "English (United States)", value: "en_US" }, { label: "English", value: "en" }, { label: "Spanish", value: "es" }, { label: "Italian", value: "it" }, { label: "Chinese", value: "zh" }, { label: "Turkish", value: "tr" }].map((l) => (<option key={l.value} value={l.value}>{l.label}</option>))}
                                    </select>
                                </div>
                                <RepeatableField label="Subject Keywords" values={subjectKeywords} setValues={setSubjectKeywords} placeholder="Enter keyword" />
                                <div>
                                    <label htmlFor="abstract" className="block text-sm font-medium text-gray-700">Abstract</label>
                                    <textarea id="abstract" value={abstractText} onChange={(e) => setAbstractText(e.target.value)} rows="3" className="mt-1 block w-full p-2 border border-gray-300 rounded-sm"></textarea>
                                </div>
                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                                    <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="mt-1 block w-full p-2 border border-gray-300 rounded-sm"></textarea>
                                </div>
                                <div>
                                    <label htmlFor="sponsors" className="block text-sm font-medium text-gray-700">Sponsors</label>
                                    <textarea id="sponsors" value={sponsors} onChange={(e) => setSponsors(e.target.value)} rows="2" placeholder="Enter sponsor details (optional)" className="mt-1 block w-full p-2 border border-gray-300 rounded-sm"></textarea>
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
                                                    <div className="flex items-center ml-2">
                                                        <label className="inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="primaryFile"
                                                                checked={primaryFileId === file.id || (!primaryFileId && files[0].id === file.id)}
                                                                onChange={() => setPrimaryFileId(file.id)}
                                                                className="form-radio h-4 w-4 text-blue-900 border-gray-300"
                                                            />
                                                            <span className="ml-1 text-xs text-gray-600">Primary</span>
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
                                                            className="ml-2 text-red-400 hover:text-red-600 cursor-pointer"
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
                                    <input id="license" type="checkbox" checked={confirmLicense} onChange={(e) => setConfirmLicense(e.target.checked)} required className="h-4 w-4 text-blue-900 border-gray-300 rounded" />
                                    <label htmlFor="license" className="ml-2 block text-sm text-gray-900">I confirm the license above</label>
                                </div>
                            </form>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500">
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
                                        <button onClick={() => changePage(-1)} disabled={pageNumber <= 1} className="px-2 py-1 bg-gray-300 rounded disabled:opacity-50 cursor-pointer"><ChevronLeft size={18} /></button>
                                        <span>Page {pageNumber} of {numPages}</span>
                                        <button onClick={() => changePage(1)} disabled={pageNumber >= numPages} className="px-2 py-1 bg-gray-300 rounded disabled:opacity-50 cursor-pointer"><RightIcon size={18} /></button>
                                        <button onClick={zoomOut} className="px-2 py-1 bg-gray-300 rounded cursor-pointer"><ZoomOut size={18} /></button>
                                        <span>{Math.round(scale * 100)}%</span>
                                        <button onClick={zoomIn} className="px-2 py-1 bg-gray-300 rounded cursor-pointer"><ZoomIn size={18} /></button>

                                        <div className="h-6 w-px  mx-2"></div>

                                        <div className="relative">
                                            <button onClick={handleMergeClick} className="p-1.5  rounded cursor-pointer" title="Merge with another file">
                                                <Merge size={18} />
                                            </button>
                                            {isMergeModalOpen && (
                                                <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-300 rounded-lg z-50">
                                                    <div className="p-3 border-b border-gray-200 flex justify-between items-center rounded-t-lg">
                                                        <h3 className="text-sm font-semibold text-gray-800">Merge Files</h3>
                                                        <button onClick={() => setIsMergeModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="p-3">

                                                        <div className="space-y-3">
                                                            <div>
                                                                <div className="border border-gray-200 rounded-sm max-h-40 overflow-y-auto">
                                                                    {files.filter(f => f.type === 'application/pdf').map(file => (
                                                                        <label key={file.id} className="flex items-center p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 border-gray-100 transition-colors">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={filesToMerge.includes(file.id)}
                                                                                onChange={() => toggleFileForMerge(file.id)}
                                                                                className="h-3.5 w-3.5 text-blue-900 border-gray-300 rounded focus:ring-blue-500"
                                                                            />
                                                                            <span className="ml-2.5 text-xs text-gray-700 truncate select-none">{file.name}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                                <p className="text-[10px] text-gray-400 mt-1 text-right">{filesToMerge.length} files selected</p>
                                                            </div>

                                                            <div>
                                                                <input
                                                                    type="text"
                                                                    value={mergeFileName}
                                                                    onChange={(e) => setMergeFileName(e.target.value)}
                                                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-sm focus:ring-blue-500 focus:border-blue-500"
                                                                    placeholder="merged_filename.pdf"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-2 bg-gray-50 rounded-b-lg flex justify-end space-x-2">
                                                        <button
                                                            onClick={handleMergeSubmit}
                                                            className="px-3 py-1.5 text-xs font-medium rounded-sm text-white bg-blue-900 cursor-pointer focus:outline-none disabled:opacity-50 transition-colors"
                                                            disabled={filesToMerge.length < 2}
                                                        >
                                                            Merge Files
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <button onClick={handleSplit} className="p-1.5  rounded cursor-pointer" title="Split at this page">
                                                <Scissors size={18} />
                                            </button>
                                            {isSplitModalOpen && (
                                                <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-300 rounded-lg z-50 p-4">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <h3 className="text-sm font-semibold text-gray-800">Split PDF</h3>
                                                        <button onClick={() => setIsSplitModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                                                            <X size={16} />
                                                        </button>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Split at Pages (comma separated)</label>
                                                            <input
                                                                type="text"
                                                                value={splitPages}
                                                                onChange={(e) => setSplitPages(e.target.value)}
                                                                placeholder="e.g. 2, 5"
                                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                                            />
                                                            <p className="text-[10px] text-gray-500 mt-1">
                                                                Splits occur after the specified page numbers.
                                                                Example: "2, 5" creates 3 files (Pages 1-2, 3-5, 6-End).
                                                            </p>
                                                        </div>

                                                        <div className="border-t border-gray-100 pt-2">
                                                            <h4 className="text-xs font-semibold text-gray-600 mb-2">Output Filenames</h4>
                                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                                                {splitNames.map((name, idx) => (
                                                                    <div key={idx}>
                                                                        <label className="block text-[10px] text-gray-500 mb-0.5">Part {idx + 1}</label>
                                                                        <input
                                                                            type="text"
                                                                            value={name}
                                                                            onChange={(e) => handleSplitNameChange(idx, e.target.value)}
                                                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                                                            placeholder={`Filename for part ${idx + 1}`}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="pt-2 flex justify-end">
                                                            <button
                                                                onClick={handleSplitSubmit}
                                                                disabled={splitNames.some(n => !n.trim()) || !splitPages}
                                                                className="px-3 py-1.5 bg-blue-900 text-white text-xs font-medium rounded disabled:opacity-50 cursor-pointer"
                                                            >
                                                                Split Files
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <button onClick={handleRename} className="p-1.5  rounded cursor-pointer" title="Rename">
                                                <Pencil size={18} />
                                            </button>
                                            {isRenameModalOpen && (
                                                <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-xl z-50 p-4">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <h3 className="text-sm font-semibold text-gray-800">Rename File</h3>
                                                        <button onClick={() => setIsRenameModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="mb-3">
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">New Filename</label>
                                                        <input
                                                            type="text"
                                                            value={renameNewName}
                                                            onChange={(e) => setRenameNewName(e.target.value)}
                                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                                            placeholder="Enter new filename"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={handleRenameSubmit}
                                                            disabled={!renameNewName.trim()}
                                                            className="px-3 py-1.5 bg-blue-900 text-white text-xs font-medium rounded cursor-pointer disabled:opacity-50"
                                                        >
                                                            Rename
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <button onClick={() => handleRotate(90)} className="p-1.5  rounded cursor-pointer" title="Rotate Page 90°">
                                            <RotateCw size={18} />
                                        </button>
                                    </div>
                                )}
                                <div className="flex-1 overflow-auto p-4">
                                    {selectedFile.type === "application/pdf" ? (
                                        <Document key={selectedFile.id} file={selectedFile.fileUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError} error={pdfError && <div>{pdfError}</div>} loading="Loading PDF...">
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
                            <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                <Eye size={48} className="mx-auto mb-4" />
                                <h3 className="text-lg font-semibold">Preview</h3>
                                <p>Select a file to preview.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>


        </div >
    );
};

export default MetadataEditor;
