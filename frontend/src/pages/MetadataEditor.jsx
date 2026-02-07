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
import { toast } from "react-toastify";
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
    const [hierarchy, setHierarchy] = useState([]);
    const [collectionId, setCollectionId] = useState("");
    const [collectionType, setCollectionType] = useState("default");

    // Common Metadata
    const [title, setTitle] = useState("");
    const [authors, setAuthors] = useState([""]);
    const [otherTitles, setOtherTitles] = useState([""]);
    const [dateOfIssue, setDateOfIssue] = useState("");
    const [publisher, setPublisher] = useState("");
    const [citation, setCitation] = useState("");
    const [series, setSeries] = useState([""]);
    const [type, setType] = useState("");
    const [language, setLanguage] = useState("en_US");
    const [subjectKeywords, setSubjectKeywords] = useState([""]);
    const [abstractText, setAbstractText] = useState("");
    const [description, setDescription] = useState("");
    const [sponsors, setSponsors] = useState("");
    const [confirmLicense, setConfirmLicense] = useState(false);
    const [identifiers, setIdentifiers] = useState([{ type: "Other", value: "" }]);

    // Archive-specific fields
    const [referenceCode, setReferenceCode] = useState("");
    const [cid, setCid] = useState("");
    const [description1, setDescription1] = useState("");
    const [archiveType, setArchiveType] = useState("");
    const [temporalCoverage, setTemporalCoverage] = useState("");
    const [calendarType, setCalendarType] = useState("");
    const [arrangement, setArrangement] = useState("");
    const [quantity, setQuantity] = useState("");
    const [medium, setMedium] = useState("");
    const [provenance, setProvenance] = useState("");
    const [accessionDate, setAccessionDate] = useState("");
    const [accessionNumber, setAccessionNumber] = useState("");
    const [immediateSource, setImmediateSource] = useState("");
    const [accessCondition, setAccessCondition] = useState("");
    const [processing, setProcessing] = useState("");
    const [security, setSecurity] = useState("");
    const [physicalDescription, setPhysicalDescription] = useState("");

    // Multimedia-specific fields
    const [mediaType, setMediaType] = useState("");
    const [composers, setComposers] = useState([""]);
    const [singersPerformers, setSingersPerformers] = useState([""]);
    const [creationDate, setCreationDate] = useState("");
    const [duration, setDuration] = useState("");
    const [physicalMedium, setPhysicalMedium] = useState("");
    const [placeOfPublication, setPlaceOfPublication] = useState("");
    const [acquisitionMethod, setAcquisitionMethod] = useState("");
    const [musicAlbum, setMusicAlbum] = useState("");

    // Serial-specific fields
    const [classification, setClassification] = useState("");
    const [offices, setOffices] = useState([""]);
    const [newspaperType, setNewspaperType] = useState("");
    const [seriesNumber, setSeriesNumber] = useState("");
    const [typeOfAcquiring, setTypeOfAcquiring] = useState("");

    // Printed-specific fields
    const [attachedDocuments, setAttachedDocuments] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [isbn, setIsbn] = useState([""]);

    // PDF viewer states
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [pdfError, setPdfError] = useState(null);

    const [uploading, setUploading] = useState(false);
    const [showFileDropdown, setShowFileDropdown] = useState(false);

    // Modal states
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [filesToMerge, setFilesToMerge] = useState([]);
    const [mergeFileName, setMergeFileName] = useState("");
    const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
    const [splitPages, setSplitPages] = useState("");
    const [splitNames, setSplitNames] = useState([]);
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
                // toast.success('Rotated successfully');
            } else {
                toast.error('Rotate failed');
            }
        } catch (error) {
            console.error(error);
            toast.error('Rotate error');
        }
    };

    const handleSplit = () => {
        if (!selectedFile) return;
        setIsMergeModalOpen(false);
        setIsRenameModalOpen(false);
        setSplitPages(String(pageNumber));
        const baseName = selectedFile.name.replace('.pdf', '');
        setSplitNames([`${baseName}_part1`, `${baseName}_part2`]);
        setIsSplitModalOpen(true);
    };

    useEffect(() => {
        if (!isSplitModalOpen) return;
        const points = splitPages.split(',').filter(p => p.trim() !== "").length;
        const numParts = points + 1;
        setSplitNames(prev => {
            const newNames = [...prev];
            if (newNames.length < numParts) {
                for (let i = newNames.length; i < numParts; i++) {
                    const baseName = selectedFile ? selectedFile.name.replace('.pdf', '') : 'file';
                    newNames.push(`${baseName}_part${i + 1}`);
                }
            } else if (newNames.length > numParts && numParts > 0) {
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
            formData.append('names', JSON.stringify(splitNames));
            const response = await fetch('/api/resources/pdf/split/', {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                const data = await response.json();
                const newFiles = [];
                for (const fileData of data.files) {
                    try {
                        const res = await fetch(fileData.url);
                        const blob = await res.blob();
                        const newFileItem = {
                            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            name: fileData.name,
                            type: 'application/pdf',
                            size: blob.size,
                            lastModified: new Date(),
                            fileObject: new File([blob], fileData.name, { type: 'application/pdf' }),
                            fileUrl: URL.createObjectURL(blob),
                        };
                        newFiles.push(newFileItem);
                    } catch (e) {
                        console.error("Failed to load split file", e);
                    }
                }
                setFiles(prev => [...prev, ...newFiles]);
                setIsSplitModalOpen(false);
                // toast.success('Split successful! Files added to list.');
            } else {
                const err = await response.json();
                toast.error('Split failed: ' + (err.error || 'Unknown error'));
            }
        } catch (error) {
            console.error(error);
            toast.error('Split error');
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
                let finalName = renameNewName;
                if (!finalName.toLowerCase().endsWith(".pdf")) finalName += ".pdf";
                const blob = await response.blob();
                const newFile = new File([blob], finalName, { type: 'application/pdf' });
                updateFileInList(selectedFile.id, newFile, finalName);
                setIsRenameModalOpen(false);
                // toast.success('Renamed successfully');
            } else {
                toast.error('Rename failed');
            }
        } catch (error) {
            console.error(error);
            toast.error('Rename error');
        }
    };

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
        setFilesToMerge(prev => prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]);
    };

    const handleMergeSubmit = async () => {
        if (filesToMerge.length < 2) {
            toast.warn("Please select at least 2 files to merge.");
            return;
        }
        try {
            const formData = new FormData();
            const orderedFilesToMerge = filesToMerge.map(id => files.find(f => f.id === id)).filter(Boolean);
            orderedFilesToMerge.forEach(file => {
                formData.append('files', file.fileObject);
            });
            const response = await fetch('/api/resources/pdf/merge/', {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                const blob = await response.blob();
                let finalName = mergeFileName || "merged.pdf";
                if (!finalName.toLowerCase().endsWith(".pdf")) finalName += ".pdf";
                const newFile = new File([blob], finalName, { type: 'application/pdf' });
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
                // toast.success('Merged file added to list');
                setTimeout(() => {
                    handleFileSelect(newFileItem.id, newFileItem);
                }, 100);
            } else {
                toast.error('Merge failed');
            }
        } catch (error) {
            console.error(error);
            toast.error('Merge error');
        }
    };

    useEffect(() => {
        const fetchHierarchy = async () => {
            try {
                const h = await dspaceService.getHierarchy();
                setHierarchy(h);

                // Flatten collections for easy lookup, but keep parent info
                const flatCollections = [];
                const processNode = (node, path = "") => {
                    if (node.type === "collection") {
                        // Skip the first part of the path (top-level community)
                        const pathParts = path.split(' > ');
                        const abbreviatedPath = pathParts.slice(1).join(' > ');
                        const label = abbreviatedPath ? `${abbreviatedPath} > ${node.name}` : node.name;

                        flatCollections.push({
                            ...node,
                            parentPath: path,
                            fullLabel: label
                        });
                    }
                    if (node.children) {
                        node.children.forEach(child => processNode(child, path ? `${path} > ${node.name}` : node.name));
                    }
                };
                h.forEach(comm => processNode(comm));
                setCollections(flatCollections);
            } catch (error) {
                console.error("Failed to fetch DSpace hierarchy:", error);
            }
        };
        fetchHierarchy();
    }, []);

    // Detect collection type when collection changes
    useEffect(() => {
        if (!collectionId || collections.length === 0) {
            setCollectionType("default");
            return;
        }

        const selectedCollection = collections.find(c => c.id === collectionId);
        if (!selectedCollection) {
            setCollectionType("default");
            return;
        }

        const collectionName = selectedCollection.name.toLowerCase();
        const parentPath = selectedCollection.parentPath ? selectedCollection.parentPath.toLowerCase() : "";
        const combined = `${parentPath} ${collectionName}`;

        // Ensure that collections under "Ethiopian digital archive and digital services" use the default DSpace metadata fields
        if (combined.includes('ethiopian digital archive and digital services')) {
            setCollectionType('default');
            return;
        }

        // Accurate mapping based on naming conventions and community structure
        if (combined.includes('archive') || combined.includes('archival')) {
            setCollectionType('archive');
        } else if (combined.includes('multimedia') || combined.includes('film') || combined.includes('music') || combined.includes('microfilm')) {
            setCollectionType('multimedia');
        } else if (combined.includes('serial') || combined.includes('journal') || combined.includes('magazine') || combined.includes('newspaper')) {
            setCollectionType('serial');
        } else if (combined.includes('printed') || combined.includes('book') || combined.includes('ethiopian studies') || combined.includes('legal deposit')) {
            setCollectionType('printed');
        } else {
            setCollectionType('default');
        }
    }, [collectionId, collections]);

    // Form field configuration
    const FORM_FIELD_CONFIGS = {
        archive: {
            show: ['referenceCode', 'cid', 'title', 'description1', 'archiveType', 'subjectKeywords', 'temporalCoverage', 'calendarType', 'arrangement', 'quantity', 'medium', 'provenance', 'accessionDate', 'accessionNumber', 'immediateSource', 'accessCondition', 'language', 'security', 'processing', 'physicalDescription'],
            required: ['referenceCode', 'cid', 'title', 'description1', 'archiveType', 'temporalCoverage', 'calendarType']
        },
        multimedia: {
            show: ['title', 'otherTitles', 'subjectKeywords', 'composers', 'singersPerformers', 'mediaType', 'description', 'creationDate', 'dateOfIssue', 'format', 'duration', 'physicalMedium', 'placeOfPublication', 'acquisitionMethod', 'musicAlbum', 'language'],
            required: ['title', 'composers', 'mediaType', 'description', 'cid', 'creationDate', 'duration']
        },
        serial: {
            show: ['title', 'authors', 'subjectKeywords', 'classification', 'offices', 'newspaperType', 'cid', 'accessionNumber', 'publisher', 'dateOfIssue', 'language', 'seriesNumber', 'physicalDescription', 'description', 'typeOfAcquiring'],
            required: ['title', 'classification', 'newspaperType', 'cid', 'publisher', 'dateOfIssue', 'typeOfAcquiring', 'authors']
        },
        printed: {
            show: ['title', 'accessionNumber', 'authors', 'dateOfIssue', 'subjectKeywords', 'offices', 'type', 'attachedDocuments', 'cid', 'subtitle', 'isbn', 'language', 'abstractText', 'publisher', 'citation', 'series'],
            required: ['title', 'authors', 'dateOfIssue', 'type', 'cid', 'accessionNumber', 'isbn', 'publisher']
        },
        default: {
            show: ['title', 'authors', 'dateOfIssue', 'publisher', 'type', 'language', 'subjectKeywords', 'abstractText', 'description', 'sponsors'],
            required: ['title', 'dateOfIssue', 'type']
        }
    };

    const config = FORM_FIELD_CONFIGS[collectionType] || FORM_FIELD_CONFIGS.default;
    const shouldShow = (field) => config.show.includes(field);
    const isRequired = (field) => config.required.includes(field);


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
            toast.warn("Please select files to upload.");
            return;
        }

        // Validate required fields
        // Validate required fields
        const requiredFields = config.required || [];
        const missing = [];

        // Common
        if (requiredFields.includes('title') && !title) missing.push("Title");
        if (requiredFields.includes('dateOfIssue') && !dateOfIssue) missing.push("Date of Issue");
        if (requiredFields.includes('type') && !type) missing.push("Type");
        if (requiredFields.includes('publisher') && !publisher) missing.push("Publisher");
        if (requiredFields.includes('authors') && (!authors[0] || !authors[0].trim())) missing.push("Authors");

        // Archive
        if (requiredFields.includes('referenceCode') && !referenceCode) missing.push("Reference Code");
        if (requiredFields.includes('cid') && !cid) missing.push("CID");
        if (requiredFields.includes('description1') && !description1) missing.push("Description 1");
        if (requiredFields.includes('archiveType') && !archiveType) missing.push("Archive Type");
        if (requiredFields.includes('temporalCoverage') && !temporalCoverage) missing.push("Temporal Coverage");
        if (requiredFields.includes('calendarType') && !calendarType) missing.push("Calendar Type");

        // Multimedia
        if (requiredFields.includes('composers') && (!composers[0] || !composers[0].trim())) missing.push("Composers");
        if (requiredFields.includes('mediaType') && !mediaType) missing.push("Media Type");
        if (requiredFields.includes('description') && !description) missing.push("Description");
        if (requiredFields.includes('creationDate') && !creationDate) missing.push("Creation Date");
        if (requiredFields.includes('duration') && !duration) missing.push("Duration");

        // Serial
        if (requiredFields.includes('classification') && !classification) missing.push("Classification");
        if (requiredFields.includes('newspaperType') && !newspaperType) missing.push("Newspaper Type");
        if (requiredFields.includes('accessionNumber') && !accessionNumber) missing.push("Accession Number");
        if (requiredFields.includes('typeOfAcquiring') && !typeOfAcquiring) missing.push("Type of Acquiring");

        // Printed
        if (requiredFields.includes('isbn') && (!isbn[0] || !isbn[0].trim())) missing.push("ISBN");

        if (missing.length > 0) {
            toast.warn(`Please fill required fields: ${missing.join(", ")}`);
            return;
        }

        if (!confirmLicense) {
            toast.warn("Please confirm the license.");
            return;
        }

        if (!collectionId) {
            toast.warn("Please select a collection.");
            return;
        }

        setUploading(true);

        if (!dspaceService.isAuthenticated && !dspaceService.authToken) {
            alert("Please sign in before uploading.");
            setUploading(false);
            return;
        }

        try {
            const workspaceItem = await dspaceService.createWorkspaceItem(collectionId);
            const workspaceItemId = workspaceItem.id;

            const metadata = {
                title,
                authors: authors.filter(a => a.trim()),
                otherTitles: otherTitles.filter(t => t.trim()),
                dateOfIssue,
                publisher,
                citation,
                series: series.filter(s => s.trim()),
                type,
                language,
                subjectKeywords: subjectKeywords.filter(k => k.trim()),
                abstractText,
                description,
                sponsors,
                identifiers: identifiers.filter(id => id.value && id.value.trim()),

                // Archive
                referenceCode,
                cid,
                description1,
                archiveType,
                temporalCoverage,
                calendarType,
                arrangement,
                quantity,
                medium,
                provenance,
                accessionDate,
                accessionNumber,
                immediateSource,
                accessCondition,
                processing,
                security,
                physicalDescription,

                // Multimedia
                mediaType,
                composers: composers.filter(c => c.trim()),
                singersPerformers: singersPerformers.filter(s => s.trim()),
                creationDate,
                duration,
                physicalMedium,
                placeOfPublication,
                acquisitionMethod,
                musicAlbum,

                // Serial
                classification,
                offices: offices.filter(o => o.trim()),
                newspaperType,
                seriesNumber,
                typeOfAcquiring,

                // Printed
                attachedDocuments,
                subtitle,
                isbn: isbn.filter(i => i.trim()),
            };

            const metaSuccess = await dspaceService.updateMetadata(workspaceItemId, metadata, collectionType);
            if (!metaSuccess) {
                console.error("Metadata update failed");
            }

            const filesToUpload = [...files].sort((a, b) => {
                if (a.id === primaryFileId) return -1;
                if (b.id === primaryFileId) return 1;
                return 0;
            });

            for (const fileItem of filesToUpload) {
                await dspaceService.uploadFile(workspaceItemId, fileItem.fileObject);
            }

            await dspaceService.acceptWorkspaceLicense(workspaceItemId);
            await dspaceService.submitWorkspaceItem(workspaceItem);

            toast.success("Upload successful! Item submitted to workflow.");

            // Reset
            setFiles([]);
            setPrimaryFileId(null);
            setSelectedFileId(null);
            setTitle("");
            setAuthors([""]);
            setOtherTitles([""]);
            setDateOfIssue("");
            setPublisher("");
            setCitation("");
            setSeries([""]);
            setType("");
            setSubjectKeywords([""]);
            setAbstractText("");
            setDescription("");
            setSponsors("");
            setConfirmLicense(false);
            setIdentifiers([{ type: "Other", value: "" }]);

            // Reset all specific fields
            setReferenceCode(""); setCid(""); setDescription1(""); setArchiveType("");
            setTemporalCoverage(""); setCalendarType(""); setArrangement(""); setQuantity("");
            setMedium(""); setProvenance(""); setAccessionDate(""); setAccessionNumber("");
            setImmediateSource(""); setAccessCondition(""); setProcessing(""); setSecurity("");
            setPhysicalDescription("");
            setMediaType(""); setComposers([""]); setSingersPerformers([""]); setCreationDate("");
            setDuration(""); setPhysicalMedium(""); setPlaceOfPublication(""); setAcquisitionMethod("");
            setMusicAlbum("");
            setClassification(""); setOffices([""]); setNewspaperType(""); setSeriesNumber("");
            setTypeOfAcquiring("");
            setAttachedDocuments(""); setSubtitle(""); setIsbn([""]);

        } catch (e) {
            console.error("Critical upload error:", e);
            toast.error("Upload failed: " + (e?.message || e));
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
                                            <option key={c.id} value={c.id}>
                                                {c.fullLabel}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Show message if no collection selected */}
                                {!collectionId && (
                                    <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-sm text-center">
                                        <p className="text-blue-900 font-medium italic">
                                            👆 Please select a collection above to start entering item metadata
                                        </p>
                                    </div>
                                )}

                                {/* Only show metadata fields after collection is selected */}
                                {collectionId && (
                                    <>
                                        {/* Reference Code & CID */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {shouldShow('referenceCode') && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Reference Code {isRequired('referenceCode') && '*'}</label>
                                                    <input type="text" value={referenceCode} onChange={(e) => setReferenceCode(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                                </div>
                                            )}
                                            {shouldShow('cid') && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">CID {isRequired('cid') && '*'}</label>
                                                    <input type="text" value={cid} onChange={(e) => setCid(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Title & Subtitle */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Title {isRequired('title') && '*'}</label>
                                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                        </div>
                                        {shouldShow('subtitle') && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Subtitle</label>
                                                <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                            </div>
                                        )}

                                        {/* Description 1 (Archive specific) */}
                                        {shouldShow('description1') && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Description 1 {isRequired('description1') && '*'}</label>
                                                <textarea value={description1} onChange={(e) => setDescription1(e.target.value)} rows="2" className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                            </div>
                                        )}

                                        {/* Archive Type */}
                                        {shouldShow('archiveType') && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Archive Type {isRequired('archiveType') && '*'}</label>
                                                <select value={archiveType} onChange={(e) => setArchiveType(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm">
                                                    <option value="">Select type</option>
                                                    <option value="Personal Archive">Personal Archive</option>
                                                    <option value="Institutional Archive">Institutional Archive</option>
                                                    <option value="Historical Archive">Historical Archive</option>
                                                </select>
                                            </div>
                                        )}

                                        <RepeatableField label="Author(s)" values={authors} setValues={setAuthors} placeholder="Enter author name" />

                                        {shouldShow('otherTitles') && (
                                            <RepeatableField label="Other Titles" values={otherTitles} setValues={setOtherTitles} placeholder="Enter other title" />
                                        )}

                                        {/* Date of Issue & Temporal Coverage */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {shouldShow('dateOfIssue') && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Date of Issue {isRequired('dateOfIssue') && '*'}</label>
                                                    <input type="date" value={dateOfIssue} onChange={(e) => setDateOfIssue(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                                </div>
                                            )}
                                            {shouldShow('temporalCoverage') && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Temporal Coverage</label>
                                                    <input type="text" value={temporalCoverage} onChange={(e) => setTemporalCoverage(e.target.value)} placeholder="e.g. 1920-1975" className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Calendar, Arrangement, Medium */}
                                        <div className="grid grid-cols-3 gap-4">
                                            {shouldShow('calendarType') && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Calendar Type</label>
                                                    <select value={calendarType} onChange={(e) => setCalendarType(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm">
                                                        <option value="">Select</option>
                                                        <option value="Ethiopian">Ethiopian</option>
                                                        <option value="Gregorian">Gregorian</option>
                                                    </select>
                                                </div>
                                            )}
                                            {shouldShow('arrangement') && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Arrangement</label>
                                                    <select value={arrangement} onChange={(e) => setArrangement(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm">
                                                        <option value="">Select</option>
                                                        <option value="Fonds">Fonds</option>
                                                        <option value="Series">Series</option>
                                                        <option value="File">File</option>
                                                        <option value="Item">Item</option>
                                                    </select>
                                                </div>
                                            )}
                                            {shouldShow('medium') && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Medium</label>
                                                    <select value={medium} onChange={(e) => setMedium(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm">
                                                        <option value="">Select</option>
                                                        <option value="Paper">Paper</option>
                                                        <option value="Digital">Digital</option>
                                                        <option value="Microfilm">Microfilm</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        {/* Quantity & Accession Info */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {shouldShow('quantity') && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                                                    <input type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 50 pages" className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                                </div>
                                            )}
                                            {shouldShow('accessionNumber') && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Accession Number {isRequired('accessionNumber') && '*'}</label>
                                                    <input type="text" value={accessionNumber} onChange={(e) => setAccessionNumber(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Multimedia Specifics */}
                                        {collectionType === 'multimedia' && (
                                            <>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {shouldShow('mediaType') && (
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Media Type {isRequired('mediaType') && '*'}</label>
                                                            <select value={mediaType} onChange={(e) => setMediaType(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm">
                                                                <option value="">Select</option>
                                                                <option value="Audio">Audio</option>
                                                                <option value="Video">Video</option>
                                                                <option value="Film">Film</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                    {shouldShow('duration') && (
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Duration</label>
                                                            <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="HH:MM:SS" className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                                        </div>
                                                    )}
                                                </div>
                                                <RepeatableField label="Composers" values={composers} setValues={setComposers} placeholder="Enter composer" />
                                                <RepeatableField label="Singers/Performers" values={singersPerformers} setValues={setSingersPerformers} placeholder="Enter name" />
                                            </>
                                        )}

                                        {/* Serial Specifics */}
                                        {collectionType === 'serial' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                {shouldShow('newspaperType') && (
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Newspaper Type {isRequired('newspaperType') && '*'}</label>
                                                        <select value={newspaperType} onChange={(e) => setNewspaperType(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm">
                                                            <option value="">Select</option>
                                                            <option value="Daily">Daily</option>
                                                            <option value="Weekly">Weekly</option>
                                                            <option value="Monthly">Monthly</option>
                                                        </select>
                                                    </div>
                                                )}
                                                {shouldShow('classification') && (
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Classification {isRequired('classification') && '*'}</label>
                                                        <input type="text" value={classification} onChange={(e) => setClassification(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Publisher & Citation */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {shouldShow('publisher') && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Publisher {isRequired('publisher') && '*'}</label>
                                                    <input type="text" value={publisher} onChange={(e) => setPublisher(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                                </div>
                                            )}
                                            {shouldShow('language') && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Language</label>
                                                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm">
                                                        <option value="en_US">English (US)</option>
                                                        <option value="am">Amharic</option>
                                                        <option value="om">Oromo</option>
                                                        <option value="ti">Tigrinya</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        {shouldShow('isbn') && (
                                            <RepeatableField label="ISBN" values={isbn} setValues={setIsbn} placeholder="Enter ISBN" />
                                        )}

                                        <RepeatableField label="Subject Keywords" values={subjectKeywords} setValues={setSubjectKeywords} placeholder="Enter keyword" />

                                        {shouldShow('abstractText') && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Abstract</label>
                                                <textarea value={abstractText} onChange={(e) => setAbstractText(e.target.value)} rows="3" className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                            </div>
                                        )}

                                        {shouldShow('description') && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Description {isRequired('description') && '*'}</label>
                                                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Identifiers</label>
                                            {identifiers.map((id, index) => (
                                                <div key={index} className="flex space-x-2 mb-2">
                                                    <select value={id.type} onChange={(e) => {
                                                        const newIds = [...identifiers];
                                                        newIds[index].type = e.target.value;
                                                        setIdentifiers(newIds);
                                                    }} className="p-2 border border-gray-300 rounded-sm bg-white">
                                                        <option value="Other">Other</option>
                                                        <option value="ISSN">ISSN</option>
                                                        <option value="ISBN">ISBN</option>
                                                        <option value="URI">URI</option>
                                                    </select>
                                                    <input type="text" placeholder="Value" value={id.value} onChange={(e) => {
                                                        const newIds = [...identifiers];
                                                        newIds[index].value = e.target.value;
                                                        setIdentifiers(newIds);
                                                    }} className="flex-grow p-2 border border-gray-300 rounded-sm" />
                                                    <button type="button" onClick={() => setIdentifiers(identifiers.filter((_, i) => i !== index))} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setIdentifiers([...identifiers, { type: 'Other', value: '' }])} className="flex items-center text-sm text-blue-900 hover:text-blue-800">
                                                <PlusCircle size={16} className="mr-1" /> Add Identifier
                                            </button>
                                        </div>

                                        {shouldShow('type') && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Type {isRequired('type') && '*'}</label>
                                                <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-sm">
                                                    <option value="">Select type</option>
                                                    <option value="Article">Article</option>
                                                    <option value="Book">Book</option>
                                                    <option value="Image">Image</option>
                                                    <option value="Video">Video</option>
                                                    <option value="Audio">Audio</option>
                                                </select>
                                            </div>
                                        )}

                                        {shouldShow('sponsors') && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Sponsors</label>
                                                <textarea value={sponsors} onChange={(e) => setSponsors(e.target.value)} rows="2" className="mt-1 block w-full p-2 border border-gray-300 rounded-sm" />
                                            </div>
                                        )}
                                    </>
                                )}

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
