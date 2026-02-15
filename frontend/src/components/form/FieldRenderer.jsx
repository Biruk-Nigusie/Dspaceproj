import { PlusIcon, Trash2Icon } from "lucide-react";
import { FieldHint, FieldLabel } from "./FormComponents";
import DateField from "./fieldTypes/DateField";
import DropdownField from "./fieldTypes/DropdownField";
import QualifiedValueField from "./fieldTypes/QualifiedValueField";
import TextAreaField from "./fieldTypes/TextAreaField";
import TextField from "./fieldTypes/TextField";

export default function FieldRenderer({ field, value, allValues, onChange }) {
	const metadata = field.selectableMetadata[0].metadata;
	const isRepeatable = field.repeatable;
	const isQualdrop =
		field.input.type === "qualdrop_value" ||
		(field.input.type === "onebox" &&
			field.selectableMetadata &&
			field.selectableMetadata.length > 1);

	const handleChange = (val) => {
		onChange(metadata, val);
	};

	const handleArrayChange = (index, val) => {
		const newArray = [...(Array.isArray(value) ? value : [])];
		newArray[index] = val;
		onChange(metadata, newArray);
	};

	const handleAdd = () => {
		const current = Array.isArray(value) ? value : [];
		onChange(metadata, [...current, ""]);
	};

	const handleRemove = (index) => {
		const current = Array.isArray(value) ? value : [];
		if (current.length <= 1) {
			onChange(metadata, [""]); // Don't remove last one, just clear it
		} else {
			onChange(
				metadata,
				current.filter((_, i) => i !== index),
			);
		}
	};

	if (isQualdrop) {
		return (
			<QualifiedValueField
				field={field}
				allValues={allValues}
				onChange={onChange}
			/>
		);
	}

	const renderInput = (val, onValChange) => {
		switch (field.input.type) {
			case "onebox":
				return <TextField field={field} value={val} onChange={onValChange} />;
			case "dropdown":
				return (
					<DropdownField field={field} value={val} onChange={onValChange} />
				);
			case "textarea":
				return (
					<TextAreaField field={field} value={val} onChange={onValChange} />
				);
			case "date":
				return <DateField field={field} value={val} onChange={onValChange} />;
			default:
				return <div>Unsupported field type: {field.input.type}</div>;
		}
	};

	return (
		<div className="space-y-1">
			<FieldLabel field={field} />

			{isRepeatable ? (
				<div className="space-y-2">
					{(Array.isArray(value) ? value : [value || ""]).map((val, index) => (
						<div key={index} className="flex gap-2 items-start">
							<div className="grow">
								{renderInput(val, (v) => handleArrayChange(index, v))}
							</div>
							<button
								type="button"
								onClick={() => handleRemove(index)}
								className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors mt-1"
								title="Remove field"
							>
								<Trash2Icon size={18} />
							</button>
						</div>
					))}
					<button
						type="button"
						onClick={handleAdd}
						className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 mt-1 px-2 py-1 rounded hover:bg-primary/10 transition-colors"
					>
						<PlusIcon size={16} /> Add another
					</button>
				</div>
			) : (
				renderInput(value, handleChange)
			)}

			<FieldHint hints={field.hints} />
		</div>
	);
}
