export function FieldLabel({ field }) {
	return (
		<label htmlFor={field.label} className="block text-sm font-medium">
			{field.label}
			{field.mandatory && <span className="text-danger"> *</span>}
		</label>
	);
}

export function FieldHint({ hints }) {
	return (
		hints && <small className="form-text text-muted-foreground">{hints}</small>
	);
}
