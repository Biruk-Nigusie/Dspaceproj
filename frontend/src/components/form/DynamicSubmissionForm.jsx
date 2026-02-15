import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import dspaceService from "../../services/dspaceService";
import FieldRenderer from "./FieldRenderer";

const SECTIONS = [
	{ id: "traditionalpageone", title: "Describe" },
	{ id: "traditionalpagetwo", title: "Describe" },
	{ id: "bitstream-metadata", title: "Document Metadata" },
];

export default function DynamicSubmissionForm() {
	const [forms, setForms] = useState([]);
	const [values, setValues] = useState({});
	const [expandedSections, setExpandedSections] = useState({
		traditionalpageone: true,
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadForms = async () => {
			try {
				const loadedForms = await Promise.all(
					SECTIONS.map(async (section) => {
						const formConfig = await dspaceService.getSubmissionForms(
							section.id,
						);
						return formConfig
							? {
									...formConfig,
									sectionId: section.id,
									sectionTitle: section.title,
								}
							: null;
					}),
				);
				setForms(loadedForms.filter(Boolean));

				// Initialize default values
				const initialValues = {};
				loadedForms.filter(Boolean).forEach((form) => {
					form.rows.forEach((row) => {
						row.fields.forEach((field) => {
							field.selectableMetadata.forEach((sm, idx) => {
								if (initialValues[sm.metadata] === undefined) {
									if (field.repeatable) {
										initialValues[sm.metadata] = idx === 0 ? [""] : [];
									} else {
										initialValues[sm.metadata] = "";
									}
								}
							});
						});
					});
				});
				setValues(initialValues);
			} catch (error) {
				console.error("Failed to load submission forms:", error);
			} finally {
				setLoading(false);
			}
		};

		loadForms();
	}, []);

	const handleChange = (metadata, value) => {
		setValues((prev) => ({
			...prev,
			[metadata]: value,
		}));
	};

	const toggleSection = (id) => {
		setExpandedSections((prev) => ({
			...prev,
			[id]: !prev[id],
		}));
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		console.log("Submitting:", values);
		// TODO: Implement submission logic per section or combined
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center p-12 space-x-2 text-muted-foreground">
				<div className="size-3 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
				<div className="size-3 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
				<div className="size-3 bg-primary rounded-full animate-bounce"></div>
			</div>
		);
	}

	if (forms.length === 0) {
		return (
			<div className="text-center p-8 text-muted-foreground bg-muted rounded-lg border border-border">
				Unable to load submission forms. Please try again later.
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6 mx-auto py-8">
			{forms.map((form) => {
				const isExpanded = expandedSections[form.sectionId];

				return (
					<fieldset
						key={form.sectionId}
						className="border border-border bg-card rounded-xl overflow-hidden"
					>
						<legend className="sr-only">
							{form.sectionTitle || form.name}
						</legend>
						<button
							type="button"
							onClick={() => toggleSection(form.sectionId)}
							className="w-full flex items-center justify-between p-4 bg-muted-foreground/15 hover:bg-muted-foreground/20 transition-colors focus:outline-none border-b border-border"
						>
							<span>{form.sectionTitle || form.name}</span>
							<ChevronDown
								size={20}
								className={`transition-transform duration-300 ${
									isExpanded ? "rotate-0" : "-rotate-90"
								}`}
							/>
						</button>

						<div
							className={`overflow-scroll transition-all duration-500 ease-in-out ${
								isExpanded
									? "max-h-[calc(100vh-24rem)] opacity-100"
									: "max-h-0 opacity-0"
							}`}
						>
							<div className="p-6 pt-2 space-y-6 border-t border-border">
								{form.rows.map((row, rIndex) => (
									<div
										key={rIndex}
										className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6"
									>
										{row.fields.map((field, fIndex) => (
											<div
												key={`${rIndex}-${fIndex}`}
												className={
													row.fields.length === 1 ? "lg:col-span-2" : ""
												}
											>
												<FieldRenderer
													field={field}
													value={values[field.selectableMetadata[0].metadata]}
													allValues={values}
													onChange={handleChange}
												/>
											</div>
										))}
									</div>
								))}
							</div>
						</div>
					</fieldset>
				);
			})}
		</form>
	);
}
