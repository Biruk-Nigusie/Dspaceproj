import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
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
	Trash2Icon,
	UploadIcon,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import dspaceService from "@/services/dspaceService";
import {
	documentStatusOptions,
	documentTypeOptions,
	genderOptions,
	houseTypeOptions,
	identifierOptions,
} from "@/utils/constants";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const houseSections = [
	{
		section: "house",
		title: "House",
		fields: [
			{
				metadata: "crvs.identifier.houseType",
				label: "House Type",
				inputType: "dropdown",
				valuePairs: "house_types",
				required: true,
			},
			{
				metadata: "crvs.identifier.otherHouseType",
				label: "Other House Type",
				inputType: "text",
				required: true,
				visibleWhen: {
					metadata: "crvs.identifier.houseType",
					equals: "ሌሎች",
				},
			},
			{
				metadata: "crvs.identifier.houseNumber",
				label: "House Number",
				inputType: "text",
				required: true,
			},
			{
				metadata: "crvs.head.husband",
				label: "Husband Name",
				inputType: "text",
			},
			{
				metadata: "crvs.head.wife",
				label: "Wife Name",
				inputType: "text",
			},
			{
				metadata: "crvs.family.member",
				label: "Additional Family Member(s)",
				inputType: "repeatable-text",
				placeholder: "Enter additional family member name",
			},
			{
				metadata: "crvs.date.registration",
				label: "Registration Date",
				inputType: "date",
			},
			{
				metadata: "crvs.family.count",
				label: "Family Count",
				inputType: "number",
			},
			{
				metadata: "dc.description",
				label: "Family Summary",
				inputType: "textarea",
			},
		],
	},
];

const vitalEventSections = [
	{
		section: "birth",
		title: "Birth",
		fields: [
			{
				metadata: "crvs.birth.childName",
				label: "Child Name",
				inputType: "text",
				valuePairs: null,
			},
			{
				metadata: "crvs.birth.gender",
				label: "Gender",
				inputType: "dropdown",
				valuePairs: "gender_types",
			},
			{
				metadata: "crvs.birth.dateOfBirth",
				label: "Date of Birth",
				inputType: "date",
				valuePairs: null,
			},
			{
				metadata: "crvs.birth.placeOfBirth",
				label: "Place of Birth",
				inputType: "text",
				valuePairs: null,
			},
			{
				metadata: "crvs.birth.childCitizenship",
				label: "Citizenship",
				inputType: "text",
				valuePairs: null,
			},
			{
				metadata: "crvs.birth.motherName",
				label: "Mother Full Name",
				inputType: "text",
				valuePairs: null,
			},
			{
				metadata: "crvs.birth.motherCitizenship",
				label: "Mother's Citizenship",
				inputType: "text",
				valuePairs: null,
			},
			{
				metadata: "crvs.birth.fatherName",
				label: "Father Full Name",
				inputType: "text",
				valuePairs: null,
			},
			{
				metadata: "crvs.birth.fatherCitizenship",
				label: "Father's Citizenship",
				inputType: "text",
				valuePairs: null,
			},
			{
				metadata: "crvs.birth.registeredDate",
				label: "Birth Registered Date",
				inputType: "date",
				valuePairs: null,
			},
			{
				metadata: "crvs.birth.certificateIssuedDate",
				label: "Certificate Issued Date",
				inputType: "date",
				valuePairs: null,
			},
		],
	},
	{
		section: "marriageAndDivorce",
		title: "Marriage and Divorce",
		fields: [
			{
				metadata: "crvs.marriage.husbandName",
				label: "Husband Name",
				inputType: "text",
				valuePairs: null,
			},
			{
				metadata: "crvs.marriage.wifeName",
				label: "Wife Name",
				inputType: "text",
				valuePairs: null,
			},
			{
				metadata: "crvs.marriage.date",
				label: "Marriage Date",
				inputType: "date",
				valuePairs: null,
			},
			{
				metadata: "crvs.divorce.date",
				label: "Divorce Date",
				inputType: "date",
				valuePairs: null,
			},
			{
				metadata: "crvs.divorce.courtApprovalDate",
				label: "Court Approval Date",
				inputType: "date",
				valuePairs: null,
			},
			{
				metadata: "crvs.divorce.courtCaseNumber",
				label: "Court Case Number",
				inputType: "text",
				valuePairs: null,
			},
		],
	},
	{
		section: "death",
		title: "Death",
		fields: [
			{
				metadata: "crvs.death.personName",
				label: "Full Name",
				inputType: "text",
				valuePairs: null,
			},
			{
				metadata: "crvs.death.gender",
				label: "Gender",
				inputType: "dropdown",
				valuePairs: "gender_types",
			},
			{
				metadata: "crvs.death.dateOfDeath",
				label: "Date of Death",
				inputType: "date",
				valuePairs: null,
			},
			{
				metadata: "crvs.death.placeOfDeath",
				label: "Place of Death",
				inputType: "text",
				valuePairs: null,
			},
			{
				metadata: "crvs.death.dateOfBirth",
				label: "Date of Birth",
				inputType: "date",
				valuePairs: null,
			},
			{
				metadata: "crvs.death.placeOfBirth",
				label: "Place of Birth",
				inputType: "text",
				valuePairs: null,
			},
			{
				metadata: "crvs.death.citizenship",
				label: "Citizenship",
				inputType: "text",
				valuePairs: null,
			},
			{
				metadata: "crvs.death.motherName",
				label: "Mother Name",
				inputType: "text",
				valuePairs: null,
			},
			{
				metadata: "crvs.death.fatherName",
				label: "Father Name",
				inputType: "text",
				valuePairs: null,
			},
			{
				metadata: "crvs.death.reason",
				label: "Cause of Death",
				inputType: "textarea",
				valuePairs: null,
			},
			{
				metadata: "crvs.death.certificateIssuedDate",
				label: "Certificate Issued Date",
				inputType: "date",
				valuePairs: null,
			},
		],
	},
];

const valuePairs = {
	gender_types: genderOptions,
	house_types: houseTypeOptions,
};

const getInitialHouseMetadata = () => ({
	"crvs.identifier.houseType": "የግል መኖሪያ ቤት",
	"crvs.identifier.otherHouseType": "",
	"crvs.identifier.houseNumber": "",
	"crvs.head.husband": "",
	"crvs.head.wife": "",
	"crvs.family.member": [""],
	"crvs.date.registration": "",
	"crvs.family.count": 0,
	"dc.description": "",
});

const getEntityTypeFromCollection = (collection) => {
	const entityTypeValues = collection?.metadata?.["dspace.entity.type"];
	if (!Array.isArray(entityTypeValues)) return "House";
	const match = entityTypeValues.find(
		(entry) =>
			typeof entry?.value === "string" && entry.value.trim().length > 0,
	);
	return match?.value || "House";
};

const normalizeEntityType = (entityType) =>
	(entityType || "").replace(/\s+/g, "").toLowerCase();

const houseMetadataKeys = new Set(
	houseSections.flatMap((section) =>
		section.fields.map((field) => field.metadata),
	),
);

const vitalEventMetadataKeys = new Set(
	vitalEventSections.flatMap((section) =>
		section.fields.map((field) => field.metadata),
	),
);

const metadataFieldConfig = new Map(
	[...houseSections, ...vitalEventSections].flatMap((section) =>
		section.fields.map((field) => [field.metadata, field]),
	),
);

const dedupeStringValues = (values) => {
	const seen = new Set();
	const result = [];

	for (const value of values || []) {
		if (typeof value !== "string") continue;
		const trimmedValue = value.trim();
		if (!trimmedValue || seen.has(trimmedValue)) continue;
		seen.add(trimmedValue);
		result.push(trimmedValue);
	}

	return result;
};

const normalizeOcrMetadata = (metadata) =>
	Object.fromEntries(
		Object.entries(metadata || {})
			.map(([field, fieldValues]) => [
				field,
				dedupeStringValues([
					...(Array.isArray(fieldValues?.en) ? fieldValues.en : []),
					...(Array.isArray(fieldValues?.am) ? fieldValues.am : []),
				]),
			])
			.filter(([_, values]) => values.length > 0),
	);

const mergeOcrCandidateMaps = (currentMap, incomingMap) => {
	const merged = { ...currentMap };

	for (const [field, values] of Object.entries(incomingMap || {})) {
		merged[field] = dedupeStringValues([...(merged[field] || []), ...values]);
	}

	return merged;
};

const isBlankMetadataValue = (value) => {
	if (Array.isArray(value)) {
		return value.every(
			(entry) => typeof entry !== "string" || entry.trim().length === 0,
		);
	}

	return typeof value !== "string" || value.trim().length === 0;
};

const applyOcrCandidatesToMetadata = (metadata, ocrCandidates, allowedKeys) => {
	const nextMetadata = { ...metadata };

	for (const [field, values] of Object.entries(ocrCandidates || {})) {
		if (!allowedKeys.has(field) || values.length === 0) continue;

		const fieldConfig = metadataFieldConfig.get(field);
		const currentValue = nextMetadata[field];

		if (!isBlankMetadataValue(currentValue)) continue;

		nextMetadata[field] =
			fieldConfig?.inputType === "repeatable-text" ? [values[0]] : values[0];
	}

	return nextMetadata;
};

const inferDocumentTypeFromOcr = (ocrDocumentType) => {
	const normalizedValue = (ocrDocumentType || "").trim().toLowerCase();
	if (!normalizedValue) return null;

	if (normalizedValue.includes("birth")) return "Birth Certificate";
	if (normalizedValue.includes("death")) return "Death Certificate";
	if (normalizedValue.includes("marriage")) return "Marriage Certificate";
	if (normalizedValue.includes("divorce")) return "Divorce Decree";
	if (normalizedValue.includes("adoption")) return "Adoption Decree";
	if (normalizedValue.includes("id")) return "ID Card";
	if (normalizedValue.includes("support")) return "Supporting Document";

	return (
		documentTypeOptions.find(
			(option) => option.toLowerCase() === normalizedValue,
		) || null
	);
};

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
			<Label
				htmlFor={`repeatable-field-container-${label}`}
				className="text-muted-foreground"
			>
				{label}
			</Label>
			<div id={`repeatable-field-container-${label}`}>
				{values.map((value, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: <ignore>
					<div key={index} className="flex items-center mb-2">
						<InputGroup>
							<InputGroupInput
								type="text"
								value={value}
								onChange={(e) => updateField(index, e.target.value)}
								placeholder={placeholder}
								autoComplete="off"
							/>
							{values.length > 1 && (
								<InputGroupAddon align="end">
									<InputGroupButton
										variant="ghost"
										onClick={() => removeField(index)}
									>
										<Trash2Icon className="text-destructive" />
									</InputGroupButton>
								</InputGroupAddon>
							)}
						</InputGroup>
					</div>
				))}
			</div>
			<Button size="sm" variant="ghost" type="button" onClick={addField}>
				<PlusCircleIcon size={16} />
				Add {label}
			</Button>
		</div>
	);
};

const IdentifiersField = ({
	label,
	identifiers,
	onChange,
	onAdd,
	onRemove,
}) => {
	return (
		<div>
			<Label>{label}</Label>
			<div>
				{identifiers.map((id, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: <ignore>
					<div key={index} className="mb-2 flex gap-2">
						<Select
							value={id.type}
							onValueChange={(value) => onChange(index, "type", value)}
							className="grow"
						>
							<SelectTrigger className="w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{identifierOptions.map((t) => (
									<SelectItem key={t.stored} value={t.stored}>
										{t.display}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<InputGroup>
							<InputGroupInput
								type="text"
								placeholder="Enter identifier"
								value={id.value}
								onChange={(e) => onChange(index, "value", e.target.value)}
								autoComplete="off"
							/>
							{identifiers.length > 1 && (
								<InputGroupAddon align="end">
									<InputGroupButton
										variant="ghost"
										onClick={() => onRemove(index)}
									>
										<Trash2Icon className="text-destructive" />
									</InputGroupButton>
								</InputGroupAddon>
							)}
						</InputGroup>
					</div>
				))}
			</div>
			<Button size="sm" variant="ghost" type="button" onClick={onAdd}>
				<PlusCircleIcon />
				Add Identifier
			</Button>
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
	const [houseMetadata, setHouseMetadata] = useState(getInitialHouseMetadata);
	const [houseIdentifiers, setHouseIdentifiers] = useState([
		{ type: "filenumber", value: "" },
	]);
	const [vitalEventMetadata, setVitalEventMetadata] = useState({});
	const [vitalEventIdentifiers, setVitalEventIdentifiers] = useState({
		birth: [{ type: "filenumber", value: "" }],
		marriageAndDivorce: [{ type: "filenumber", value: "" }],
		death: [{ type: "filenumber", value: "" }],
	});
	const [ocrMetadataCandidates, setOcrMetadataCandidates] = useState({});
	const [ocrLoadingCount, setOcrLoadingCount] = useState(0);

	// PDF viewer states
	const [numPages, setNumPages] = useState(null);
	const [pageNumber, setPageNumber] = useState(1);
	const [scale, setScale] = useState(1.0);
	const [pdfError, setPdfError] = useState(null);

	const [uploading, setUploading] = useState(false);

	// Refs
	const collectionDropdownRef = useRef(null);
	const ocrMetadataCandidatesRef = useRef({});

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
		fetchDspaceCollections();
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

	const mergeOcrMetadataIntoForm = (incomingCandidates) => {
		const mergedCandidates = mergeOcrCandidateMaps(
			ocrMetadataCandidatesRef.current,
			incomingCandidates,
		);

		ocrMetadataCandidatesRef.current = mergedCandidates;
		setOcrMetadataCandidates(mergedCandidates);
		setHouseMetadata((prev) =>
			applyOcrCandidatesToMetadata(prev, mergedCandidates, houseMetadataKeys),
		);
		setVitalEventMetadata((prev) =>
			applyOcrCandidatesToMetadata(
				prev,
				mergedCandidates,
				vitalEventMetadataKeys,
			),
		);
	};

	const applyOcrDocumentTypeToFiles = (fileIds, ocrCandidates) => {
		const inferredDocumentType = (ocrCandidates["crvs.documentType"] || [])
			.map(inferDocumentTypeFromOcr)
			.find(Boolean);

		if (!inferredDocumentType) return;

		setFiles((prev) =>
			prev.map((file) =>
				fileIds.includes(file.id) &&
				(!file.documentType || file.documentType === "Other")
					? { ...file, documentType: inferredDocumentType }
					: file,
			),
		);
	};

	const extractOcrMetadataForFiles = async (uploadedFiles, fileIds) => {
		if (uploadedFiles.length === 0) return;

		setOcrLoadingCount((prev) => prev + 1);

		try {
			const formData = new FormData();
			for (const file of uploadedFiles) {
				formData.append("files", file);
			}

			const response = await fetch("/api/ocr/extract/", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new Error(`OCR request failed with status ${response.status}`);
			}

			const data = await response.json();
			const normalizedMetadata = normalizeOcrMetadata(data?.metadata);

			if (Object.keys(normalizedMetadata).length > 0) {
				mergeOcrMetadataIntoForm(normalizedMetadata);
				applyOcrDocumentTypeToFiles(fileIds, normalizedMetadata);
			}
		} catch (error) {
			console.error("OCR metadata extraction failed:", error);
		} finally {
			setOcrLoadingCount((prev) => Math.max(prev - 1, 0));
		}
	};

	const handleFileUpload = async (event) => {
		const uploadedFiles = Array.from(event.target.files || []);
		if (uploadedFiles.length === 0) return;

		const newFileItems = uploadedFiles.map((file) => ({
			id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			name: file.name,
			type: file.type,
			size: file.size,
			lastModified: new Date(file.lastModified),
			fileObject: file,
			fileUrl: URL.createObjectURL(file),
			documentType: "Other",
			documentStatus: "Active",
		}));

		setFiles((prev) => [...prev, ...newFileItems]);

		if (newFileItems.length > 0 && !selectedFileId) {
			handleFileSelect(newFileItems[0].id);
		}

		event.target.value = "";
		await extractOcrMetadataForFiles(
			uploadedFiles,
			newFileItems.map((file) => file.id),
		);
	};

	const handleFileSelect = (fileId, _fileObj = null) => {
		setSelectedFileId(fileId);
		setPageNumber(1);
		setNumPages(null);
		setPdfError(null);
	};

	const isEmpty = files.length === 0;
	const selectedCollection = collections.find((c) => c.uuid === collectionId);
	const entityType = getEntityTypeFromCollection(selectedCollection);
	const isVitalEventType = normalizeEntityType(entityType) === "vitalevent";
	const isHouseType = !isVitalEventType;

	const handleFileMetadataChange = (fileId, field, value) => {
		setFiles((prev) =>
			prev.map((f) => {
				if (f.id === fileId) {
					return { ...f, [field]: value };
				}
				return f;
			}),
		);
	};

	const handleVitalEventFieldChange = (metadataKey, value) => {
		setVitalEventMetadata((prev) => ({
			...prev,
			[metadataKey]: value,
		}));
	};
	const handleHouseFieldChange = (metadataKey, value) => {
		setHouseMetadata((prev) => ({
			...prev,
			[metadataKey]: value,
		}));
	};

	const renderOcrCandidateSelector = (
		metadataKey,
		currentValue,
		onValueChange,
	) => {
		const candidates = ocrMetadataCandidates[metadataKey] || [];
		if (candidates.length <= 1) return null;

		const normalizedCurrentValue = Array.isArray(currentValue)
			? currentValue.find(
					(value) => typeof value === "string" && value.trim().length > 0,
				) || ""
			: currentValue || "";

		const selectedCandidateIndex = candidates.indexOf(normalizedCurrentValue);

		return (
			<div className="mt-2 rounded-md border border-amber-200 bg-amber-50/60 p-2">
				<p className="text-xs text-amber-900">
					OCR found {candidates.length} possible values for this field.
				</p>
				<Select
					value={
						selectedCandidateIndex >= 0
							? String(selectedCandidateIndex)
							: undefined
					}
					onValueChange={(value) =>
						onValueChange(candidates[Number.parseInt(value, 10)])
					}
				>
					<SelectTrigger className="mt-2 w-full bg-background">
						<SelectValue placeholder="Choose an OCR value" />
					</SelectTrigger>
					<SelectContent>
						{candidates.map((candidate, index) => (
							<SelectItem
								key={`${metadataKey}-${candidate}`}
								value={String(index)}
							>
								{candidate}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		);
	};

	const handleSubmit = async () => {
		if (uploading || files.length === 0) {
			alert("Please select files to upload.");
			return;
		}

		if (
			!collectionId ||
			(isHouseType && !houseMetadata["crvs.identifier.houseNumber"])
		) {
			const message = isHouseType
				? "Please fill all mandatory fields: House Number, House Type and Collection"
				: "Please select a collection.";
			alert(message);
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
				filenumber: "dc.identifier.filenumber",
				issn: "dc.identifier.issn",
				other: "dc.identifier.other",
			};

			const processIdentifierList = (identifierList) => {
				const result = {};
				const otherIdentifiers = [];

				(identifierList || []).forEach((id) => {
					if (!id.value || !id.value.trim()) return;

					if (id.type === "other") {
						otherIdentifiers.push(id.value);
					} else {
						const key = identifierMap[id.type];
						if (key) {
							if (!result[key]) {
								result[key] = [];
							}
							result[key].push(id.value);
						}
					}
				});

				if (otherIdentifiers.length > 0) {
					result["dc.identifier.other"] = otherIdentifiers;
				}

				return result;
			};

			const processSectionIdentifierList = (section, identifierList) => {
				const result = {};
				const otherIdentifiers = [];

				(identifierList || []).forEach((id) => {
					if (!id.value || !id.value.trim()) return;

					if (id.type === "other") {
						otherIdentifiers.push(id.value);
					} else {
						const key = identifierMap[id.type];
						if (key) {
							if (!result[key]) {
								result[key] = [];
							}
							result[key].push(id.value);
						}
					}
				});

				if (otherIdentifiers.length > 0) {
					result["dc.identifier.other"] = otherIdentifiers;
				}

				return Object.entries(result).map(([field, values]) => ({
					section,
					field,
					values,
				}));
			};

			const processedHouseIdentifiers = processIdentifierList(houseIdentifiers);
			const processedVitalEventIdentifiers = Object.entries(
				vitalEventIdentifiers,
			).flatMap(([section, list]) =>
				processSectionIdentifierList(section, list),
			);

			const rawMetadata = isHouseType
				? {
						...houseMetadata,
						"crvs.identifier.houseFamilyKey": `${houseMetadata["crvs.identifier.houseNumber"]} - ${houseMetadata["crvs.head.husband"] || ""} - ${houseMetadata["crvs.head.wife"] || ""}`,
						"crvs.family.member": (
							houseMetadata["crvs.family.member"] || []
						).filter((value) => value.trim()),
						...processedHouseIdentifiers,
					}
				: {
						...vitalEventMetadata,
					};

			// Filter empty fields
			const metadataFields = Object.fromEntries(
				Object.entries(rawMetadata).filter(([_, v]) => {
					if (Array.isArray(v)) return v.length > 0;
					return v !== null && v !== undefined && v !== "";
				}),
			);

			const metaSuccess = await dspaceService.updateMetadata(
				workspaceItemId,
				metadataFields,
				processedVitalEventIdentifiers,
			);
			if (!metaSuccess) {
				console.error(
					"Metadata update failed, but proceeding with file upload...",
				);
			}

			for (const file of files) {
				const bitstream = await dspaceService.uploadFile(
					workspaceItemId,
					file.fileObject,
				);

				if (bitstream?.uuid) {
					await dspaceService.updateBitstreamMetadata(bitstream.uuid, {
						documentType: file.documentType,
						documentStatus: file.documentStatus,
					});
				} else {
					console.error(`Failed to upload file: ${file.name}`);
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
			setSelectedFileId(null);
			setHouseMetadata(getInitialHouseMetadata());
			setVitalEventMetadata({});
			ocrMetadataCandidatesRef.current = {};
			setOcrMetadataCandidates({});
			setHouseIdentifiers([{ type: "filenumber", value: "" }]);
			setVitalEventIdentifiers({
				birth: [{ type: "filenumber", value: "" }],
				marriageAndDivorce: [{ type: "filenumber", value: "" }],
				death: [{ type: "filenumber", value: "" }],
			});
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

	const handleHouseIdentifierChange = (index, field, value) => {
		const newIdentifiers = [...houseIdentifiers];
		newIdentifiers[index][field] = value;
		setHouseIdentifiers(newIdentifiers);
	};
	const addHouseIdentifier = () => {
		setHouseIdentifiers([
			...houseIdentifiers,
			{ type: "filenumber", value: "" },
		]);
	};
	const removeHouseIdentifier = (index) =>
		setHouseIdentifiers(houseIdentifiers.filter((_, i) => i !== index));

	const handleVitalIdentifierChange = (section, index, field, value) => {
		setVitalEventIdentifiers((prev) => {
			const sectionIdentifiers = [...(prev[section] || [])];
			sectionIdentifiers[index] = {
				...sectionIdentifiers[index],
				[field]: value,
			};
			return { ...prev, [section]: sectionIdentifiers };
		});
	};
	const addVitalIdentifier = (section) => {
		setVitalEventIdentifiers((prev) => ({
			...prev,
			[section]: [...(prev[section] || []), { type: "filenumber", value: "" }],
		}));
	};
	const removeVitalIdentifier = (section, index) => {
		setVitalEventIdentifiers((prev) => ({
			...prev,
			[section]: (prev[section] || []).filter((_, i) => i !== index),
		}));
	};

	const onDocumentLoadError = (_error) => setPdfError("Failed to load PDF.");
	const changePage = (offset) =>
		setPageNumber((prev) => Math.min(Math.max(prev + offset, 1), numPages));
	const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0));
	const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

	// auto-select when only one collection exists
	useEffect(() => {
		if (collections.length === 1 && !collectionId) {
			setCollectionId(collections[0].uuid);
		}
	}, [collections, collectionId]);

	return (
		<div className="flex h-full min-h-[calc(100vh-4rem)] flex-col">
			{/* Top Bar */}
			<div className="border-b border-border p-4 sticky top-0 bg-background z-50">
				<div className="flex items-center justify-between">
					<h1 className="text-lg font-bold">Upload Files</h1>
					<div className="flex items-center space-x-3">
						<Button size="lg" className="relative">
							<UploadIcon />
							Upload Files
							<input
								type="file"
								multiple
								className="absolute inset-0 cursor-pointer opacity-0"
								onChange={handleFileUpload}
							/>
						</Button>

						<Select
							value={isEmpty ? undefined : selectedFileId}
							onValueChange={handleFileSelect}
						>
							<SelectTrigger className="min-w-72 h-9!" disabled={isEmpty}>
								<SelectValue
									placeholder={isEmpty ? "No file uploaded" : "Select File"}
								>
									{selectedFile?.name}
								</SelectValue>
							</SelectTrigger>

							<SelectContent className="max-h-80">
								{files.map((file) => (
									<SelectItem key={file.id} value={file.id}>
										<div className="flex items-center gap-2">
											{getFileIcon(file.type)}
											<div className="flex flex-col items-start overflow-hidden">
												<span className="truncate text-sm font-medium">
													{file.name}
												</span>
												<span className="text-xs text-muted-foreground">
													{formatFileSize(file.size)} • {file.type}
												</span>
											</div>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							size="lg"
							type="button"
							onClick={handleSubmit}
							disabled={uploading || files.length === 0}
							className="bg-green-600 text-white hover:bg-green-700 transition-colors disabled:bg-gray-400"
						>
							{uploading ? "Uploading..." : "Submit"}
						</Button>
						{ocrLoadingCount > 0 && (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<RotateCw className="h-4 w-4 animate-spin" />
								<span>Extracting OCR metadata...</span>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex flex-1 overflow-hidden">
				{/* Left Panel - Metadata Form */}
				<div className="w-1/2 overflow-y-auto p-6 border-r border-border">
					<div className="max-w-2xl mx-auto h-full">
						{selectedFile ? (
							<form
								onSubmit={(e) => {
									e.preventDefault();
									handleSubmit();
								}}
								className="space-y-6"
							>
								{/* Form fields here - keeping it brief for the rest */}
								<div>
									<Label htmlFor="collection">
										Select Woreda <span className="text-destructive">*</span>
									</Label>
									<Select
										value={collectionId || undefined}
										onValueChange={(value) => setCollectionId(value)}
										disabled={collections.length === 0}
									>
										<SelectTrigger className="w-full">
											<SelectValue
												placeholder={
													loadingCollections
														? "Loading collections..."
														: collections.length === 0
															? "No collections available"
															: "Select a collection"
												}
											/>
										</SelectTrigger>
										<SelectContent
											className="max-h-80"
											onScroll={(e) => {
												const { scrollTop, scrollHeight, clientHeight } =
													e.currentTarget;

												if (scrollHeight - scrollTop <= clientHeight * 1.2) {
													loadMoreCollections();
												}
											}}
										>
											{collections.map((c) => (
												<SelectItem key={c.uuid} value={c.uuid}>
													{c.name}
												</SelectItem>
											))}

											{loadingCollections && collections.length > 0 && (
												<div className="px-3 py-2 text-sm text-muted-foreground text-center">
													Loading more...
												</div>
											)}
										</SelectContent>
									</Select>
								</div>

								{isHouseType
									? houseSections.map((section) => (
											<div key={section.section} className="space-y-4">
												{section.fields.map((field) => {
													const isVisible = field.visibleWhen
														? houseMetadata[field.visibleWhen.metadata] ===
															field.visibleWhen.equals
														: true;
													if (!isVisible) return null;

													if (field.inputType === "repeatable-text") {
														return (
															<div key={field.metadata}>
																<RepeatableField
																	label={field.label}
																	values={houseMetadata[field.metadata] || [""]}
																	setValues={(values) =>
																		handleHouseFieldChange(
																			field.metadata,
																			values,
																		)
																	}
																	placeholder={field.placeholder}
																/>
																{renderOcrCandidateSelector(
																	field.metadata,
																	houseMetadata[field.metadata] || [""],
																	(value) =>
																		handleHouseFieldChange(field.metadata, [
																			value,
																		]),
																)}
															</div>
														);
													}

													return (
														<div key={field.metadata}>
															<Label htmlFor={field.metadata}>
																{field.label}
																{field.required ? (
																	<span className="text-destructive"> *</span>
																) : null}
															</Label>
															{field.inputType === "dropdown" ? (
																<Select
																	value={
																		houseMetadata[field.metadata] || undefined
																	}
																	onValueChange={(value) =>
																		handleHouseFieldChange(
																			field.metadata,
																			value,
																		)
																	}
																>
																	<SelectTrigger className="w-full">
																		<SelectValue
																			placeholder={`Select ${field.label}`}
																		/>
																	</SelectTrigger>
																	<SelectContent>
																		{(valuePairs[field.valuePairs] || []).map(
																			(option) => (
																				<SelectItem key={option} value={option}>
																					{option}
																				</SelectItem>
																			),
																		)}
																	</SelectContent>
																</Select>
															) : field.inputType === "textarea" ? (
																<Textarea
																	id={field.metadata}
																	value={houseMetadata[field.metadata] || ""}
																	onChange={(e) =>
																		handleHouseFieldChange(
																			field.metadata,
																			e.target.value,
																		)
																	}
																	rows="3"
																/>
															) : (
																<Input
																	id={field.metadata}
																	type={field.inputType}
																	value={houseMetadata[field.metadata] || ""}
																	onChange={(e) =>
																		handleHouseFieldChange(
																			field.metadata,
																			e.target.value,
																		)
																	}
																	required={field.required}
																	autoComplete="off"
																/>
															)}
															{renderOcrCandidateSelector(
																field.metadata,
																houseMetadata[field.metadata] || "",
																(value) =>
																	handleHouseFieldChange(field.metadata, value),
															)}
														</div>
													);
												})}
											</div>
										))
									: vitalEventSections.map((section) => (
											<div key={section.section} className="space-y-3">
												<h3 className="font-semibold">{section.title}</h3>
												{section.fields.map((field) => (
													<div key={field.metadata}>
														<Label htmlFor={field.metadata}>
															{field.label}
														</Label>
														{field.inputType === "dropdown" ? (
															<Select
																value={
																	vitalEventMetadata[field.metadata] ||
																	undefined
																}
																onValueChange={(value) =>
																	handleVitalEventFieldChange(
																		field.metadata,
																		value,
																	)
																}
															>
																<SelectTrigger className="w-full">
																	<SelectValue
																		placeholder={`Select ${field.label}`}
																	/>
																</SelectTrigger>
																<SelectContent>
																	{(valuePairs[field.valuePairs] || []).map(
																		(option) => (
																			<SelectItem key={option} value={option}>
																				{option}
																			</SelectItem>
																		),
																	)}
																</SelectContent>
															</Select>
														) : field.inputType === "textarea" ? (
															<Textarea
																id={field.metadata}
																value={vitalEventMetadata[field.metadata] || ""}
																onChange={(e) =>
																	handleVitalEventFieldChange(
																		field.metadata,
																		e.target.value,
																	)
																}
																rows="3"
															/>
														) : (
															<Input
																id={field.metadata}
																type={field.inputType}
																value={vitalEventMetadata[field.metadata] || ""}
																onChange={(e) =>
																	handleVitalEventFieldChange(
																		field.metadata,
																		e.target.value,
																	)
																}
															/>
														)}
														{renderOcrCandidateSelector(
															field.metadata,
															vitalEventMetadata[field.metadata] || "",
															(value) =>
																handleVitalEventFieldChange(
																	field.metadata,
																	value,
																),
														)}
													</div>
												))}
												<IdentifiersField
													label={`${section.title} Identifiers`}
													identifiers={
														vitalEventIdentifiers[section.section] || [
															{ type: "filenumber", value: "" },
														]
													}
													onChange={(index, field, value) =>
														handleVitalIdentifierChange(
															section.section,
															index,
															field,
															value,
														)
													}
													onAdd={() => addVitalIdentifier(section.section)}
													onRemove={(index) =>
														removeVitalIdentifier(section.section, index)
													}
												/>
											</div>
										))}

								{isHouseType && (
									<IdentifiersField
										label="Identifiers"
										identifiers={houseIdentifiers}
										onChange={handleHouseIdentifierChange}
										onAdd={addHouseIdentifier}
										onRemove={removeHouseIdentifier}
									/>
								)}

								{/* File List Section */}
								<div>
									<Label htmlFor="file-input">Files</Label>
									<div id="file-input">
										{files.length > 0 ? (
											<div className="space-y-2">
												{files.map((file) => (
													<Card key={file.id} className="rounded-md">
														<CardContent>
															<div className="flex items-center justify-between mb-2">
																<div className="flex items-center overflow-hidden gap-2">
																	<div className="text-muted-foreground">
																		{getFileIcon(file.type)}
																	</div>
																	<div className="flex flex-col">
																		<span
																			className="text-sm truncate max-w-37.5"
																			title={file.name}
																		>
																			{file.name}
																		</span>
																		<span className="text-xs text-muted-foreground">
																			{formatFileSize(file.size)} • {file.type}
																		</span>
																	</div>
																</div>
																<div className="flex items-center ml-2">
																	<Button
																		size="icon"
																		variant="ghost"
																		type="button"
																		onClick={() => {
																			if (
																				window.confirm(
																					"Are you sure you want to remove this file?",
																				)
																			) {
																				const newFiles = files.filter(
																					(f) => f.id !== file.id,
																				);
																				setFiles(newFiles);
																				if (selectedFileId === file.id)
																					setSelectedFileId(null);
																			}
																		}}
																	>
																		<Trash2Icon
																			size={14}
																			className="text-destructive"
																		/>
																	</Button>
																</div>
															</div>
															<div className="flex space-x-2">
																<Select
																	value={file.documentType || "Other"}
																	onValueChange={(value) =>
																		handleFileMetadataChange(
																			file.id,
																			"documentType",
																			value,
																		)
																	}
																>
																	<SelectTrigger>
																		<SelectValue />
																	</SelectTrigger>
																	<SelectContent>
																		{documentTypeOptions.map((opt) => (
																			<SelectItem key={opt} value={opt}>
																				{opt}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
																<Select
																	value={file.documentStatus || "Active"}
																	onValueChange={(value) =>
																		handleFileMetadataChange(
																			file.id,
																			"documentStatus",
																			value,
																		)
																	}
																>
																	<SelectTrigger>
																		<SelectValue />
																	</SelectTrigger>
																	<SelectContent>
																		{documentStatusOptions.map((opt) => (
																			<SelectItem key={opt} value={opt}>
																				{opt}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															</div>
														</CardContent>
													</Card>
												))}
											</div>
										) : (
											<p className="text-sm text-gray-500 italic">
												No files selected.
											</p>
										)}
									</div>
								</div>
							</form>
						) : (
							<div className="flex justify-center text-muted-foreground/80 items-center h-full">
								<div className="text-center">
									<FileText size={48} className="mx-auto mb-4" />
									<h3 className="text-lg font-semibold">No file selected</h3>
									<p>Please upload a file and select it to edit metadata.</p>
								</div>
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
								<div className="flex-1 w-full overflow-auto p-4">
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
