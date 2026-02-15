import { useEffect, useState } from "react";
import dspaceService from "../../../services/dspaceService";

export default function DropdownField({ field, value, onChange }) {
	const [options, setOptions] = useState([]);

	useEffect(() => {
		const vocab = field.selectableMetadata[0].controlledVocabulary;

		if (vocab) {
			dspaceService.getVocabularies(vocab).then((res) => {
				if (res) {
					setOptions(res._embedded?.entries || []);
				}
			});
		}
	}, [field]);

	return (
		<select
			id={field.label}
			className="mt-1 block w-full p-2 border border-border rounded-md"
			value={value}
			required={field.mandatory}
			onChange={(e) => onChange(e.target.value)}
		>
			<option value="">-- Select --</option>
			{options.map((opt) => (
				<option key={opt.value} value={opt.value}>
					{opt.display}
				</option>
			))}
		</select>
	);
}
