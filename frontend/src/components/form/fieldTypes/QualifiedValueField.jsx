import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { FieldHint, FieldLabel } from "../FormComponents";

export default function QualifiedValueField({ field, allValues, onChange }) {
	const selectableMetadata = field.selectableMetadata || [];
	const defaultMetadata = selectableMetadata[0]?.metadata;

	const [items, setItems] = useState([]);

	// Initialize local state from external values on mount or when field definition changes
	useEffect(() => {
		const initialItems = [];
		selectableMetadata.forEach((option) => {
			const metaValues = allValues[option.metadata];
			if (Array.isArray(metaValues)) {
				metaValues.forEach((val) => {
					initialItems.push({
						id: Math.random().toString(36).substr(2, 9),
						metadata: option.metadata,
						value: val,
					});
				});
			} else if (metaValues) {
				// Handle single string case just in case
				initialItems.push({
					id: Math.random().toString(36).substr(2, 9),
					metadata: option.metadata,
					value: metaValues,
				});
			}
		});
		setItems(initialItems);
		// We only want to run this when the field definition effectively changes,
		// or on mount. relying on field.label as a stable identity key.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [allValues, selectableMetadata]);

	const syncChanges = (newItems) => {
		// Update ALL metadata fields involved to ensure consistency
		selectableMetadata.forEach((opt) => {
			const meta = opt.metadata;
			const valuesForMeta = newItems
				.filter((i) => i.metadata === meta)
				.map((i) => i.value);

			onChange(meta, valuesForMeta);
		});
	};

	const handleAdd = () => {
		const newItem = {
			id: Math.random().toString(36).substr(2, 9),
			metadata: defaultMetadata,
			value: "",
		};
		const newItems = [...items, newItem];
		setItems(newItems);
		syncChanges(newItems);
	};

	const handleRemove = (id) => {
		const newItems = items.filter((i) => i.id !== id);
		setItems(newItems);
		syncChanges(newItems);
	};

	const handleChangeQualifier = (id, newUniqMetadata) => {
		const newItems = items.map((i) =>
			i.id === id ? { ...i, metadata: newUniqMetadata } : i,
		);
		setItems(newItems);
		syncChanges(newItems);
	};

	const handleChangeValue = (id, newValue) => {
		const newItems = items.map((i) =>
			i.id === id ? { ...i, value: newValue } : i,
		);
		setItems(newItems);
		syncChanges(newItems);
	};

	return (
		<div className="space-y-1">
			<FieldLabel field={field} />

			<div className="space-y-2">
				{items.map((item) => (
					<div key={item.id} className="flex gap-2 items-center">
						{/* Qualifier Dropdown */}
						<div className="min-w-[120px]">
							<select
								className="block w-fit p-2 border border-border rounded-md bg-background"
								value={item.metadata}
								onChange={(e) => handleChangeQualifier(item.id, e.target.value)}
							>
								{selectableMetadata.map((opt) => (
									<option key={opt.metadata} value={opt.metadata}>
										{opt.label}
									</option>
								))}
							</select>
						</div>

						{/* Value Input */}
						<div className="grow">
							<input
								type="text"
								className="block w-full p-2 border border-border rounded-md bg-background"
								value={item.value}
								onChange={(e) => handleChangeValue(item.id, e.target.value)}
							/>
						</div>

						{/* Remove Button */}
						<button
							type="button"
							onClick={() => handleRemove(item.id)}
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

			<FieldHint hints={field.hints} />
		</div>
	);
}
