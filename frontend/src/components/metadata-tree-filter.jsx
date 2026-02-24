import { Filter, XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export default function MetadataTreeFilter({
	resources,
	selectedFilters = {},
	onFilterChange,
	onClearFilters,
}) {
	// Dynamically extract metadata options from resources
	const filterOptions = useMemo(() => {
		if (!resources || resources.length === 0) return {};

		const options = {
			parentCommunity: {},
			owningCollection: {},
		};

		let minYear = Infinity;
		let maxYear = -Infinity;

		resources.forEach((resource) => {
			// Registration Date
			if (resource.dateOfRegistration) {
				const match = resource.dateOfRegistration.match(/^(\d{4})/);
				if (match) {
					const y = parseInt(match[1], 10);
					if (y < minYear) minYear = y;
					if (y > maxYear) maxYear = y;
				}
			}

			if (resource.parentCommunity) {
				options.parentCommunity[resource.parentCommunity] =
					(options.parentCommunity[resource.parentCommunity] || 0) + 1;
			}

			if (resource.owningCollection) {
				options.owningCollection[resource.owningCollection] =
					(options.owningCollection[resource.owningCollection] || 0) + 1;
			}
		});

		// Sort keys and take top authors
		const sortedOptions = {
			yearRange: minYear <= maxYear ? { min: minYear, max: maxYear } : null,
			parentCommunity: Object.entries(options.parentCommunity).sort(
				(a, b) => b[1] - a[1],
			),
			owningCollection: Object.entries(options.owningCollection).sort(
				(a, b) => b[1] - a[1],
			),
		};

		return sortedOptions;
	}, [resources]);

	const toggleFilter = (category, value) => {
		const newFilters = { ...selectedFilters };

		if (!newFilters[category]) {
			newFilters[category] = [];
		}

		if (newFilters[category].includes(String(value))) {
			newFilters[category] = newFilters[category].filter(
				(item) => item !== String(value),
			);
			if (newFilters[category].length === 0) {
				delete newFilters[category];
			}
		} else {
			newFilters[category].push(String(value));
		}

		onFilterChange(newFilters);
	};

	const clearFilters = () => {
		if (onClearFilters) {
			onClearFilters();
		} else {
			onFilterChange({});
		}
	};

	const TreeNode = ({ label, category, items }) => {
		if (!items || items.length === 0) return null;

		const hasActiveFilter =
			selectedFilters[category] && selectedFilters[category].length > 0;

		return (
			<AccordionItem value={label} className="">
				<AccordionTrigger className="space-x-2 hover:no-underline">
					<span className="text-sm">{label}</span>
					{hasActiveFilter && (
						<span className="bg-muted text-primary text-xs px-2 py-0.5 rounded-full">
							{selectedFilters[category].length}
						</span>
					)}
				</AccordionTrigger>
				<AccordionContent>
					{items.map(([itemLabel, count]) => {
						const isSelected = selectedFilters[category]?.includes(itemLabel);
						return (
							<div key={itemLabel} className="flex items-center group">
								<Label className="flex items-center w-full cursor-pointer py-1">
									<Checkbox
										checked={isSelected}
										onCheckedChange={() => toggleFilter(category, itemLabel)}
									/>
									<span className="text-sm truncate mr-2">{itemLabel}</span>
									<span className="text-xs text-muted-foreground ml-auto bg-muted px-1.5 rounded-full min-w-[20px] text-center">
										{count}
									</span>
								</Label>
							</div>
						);
					})}
				</AccordionContent>
			</AccordionItem>
		);
	};

	const SliderNode = ({ label, category, rangeData }) => {
		const fallbackMin = rangeData?.min ?? 0;
		const fallbackMax = rangeData?.max ?? 0;
		const externalRange = selectedFilters[category] || [
			fallbackMin,
			fallbackMax,
		];

		const [localRange, setLocalRange] = useState(externalRange);

		const externalRangeStr = JSON.stringify(externalRange);

		// Sync local state when filters change externally
		useEffect(() => {
			setLocalRange(JSON.parse(externalRangeStr));
		}, [externalRangeStr]);

		if (
			!rangeData ||
			rangeData.min === undefined ||
			rangeData.max === undefined
		)
			return null;

		if (rangeData.min === rangeData.max) return null;

		const hasActiveFilter =
			localRange[0] > rangeData.min || localRange[1] < rangeData.max;

		return (
			<AccordionItem value={label}>
				<AccordionTrigger className="space-x-2 hover:no-underline">
					<span className="text-sm">{label}</span>
					{hasActiveFilter && (
						<span className="bg-muted text-primary text-xs px-2 py-0.5 rounded-full">
							Filtered
						</span>
					)}
				</AccordionTrigger>

				<AccordionContent>
					<div className="space-y-4">
						<div className="flex justify-between text-xs text-muted-foreground font-medium">
							<span>{localRange[0]}</span>
							<span>{localRange[1]}</span>
						</div>

						<Slider
							min={rangeData.min}
							max={rangeData.max}
							step={1}
							value={localRange}
							onValueChange={(val) => {
								setLocalRange(val); // smooth UI update
							}}
							onValueCommit={(val) => {
								const newFilters = { ...selectedFilters };

								if (val[0] === rangeData.min && val[1] === rangeData.max) {
									delete newFilters[category];
								} else {
									newFilters[category] = val;
								}

								onFilterChange(newFilters);
							}}
						/>
					</div>
				</AccordionContent>
			</AccordionItem>
		);
	};

	const hasAnyFilter = Object.keys(selectedFilters).length > 0;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between min-h-9">
					<h3 className="font-semibold text-muted-foreground flex items-center">
						<Filter className="size-4 text-primary mr-2" />
						Filters
					</h3>
					{hasAnyFilter && (
						<Button
							variant="destructive"
							type="button"
							onClick={clearFilters}
							size="sm"
						>
							<XIcon className="mr-2 size-4" />
							Clear
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent>
				<Accordion
					collapsible
					type="multiple"
					defaultValue="Sub City"
					className="max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar divide-dashed divide-muted-foreground/50 divide-y [&>div]:not-first:pt-2 [&>div]:not-last:pb-4"
				>
					<TreeNode
						label="Sub City"
						category="parentCommunity"
						items={filterOptions.parentCommunity}
					/>
					<TreeNode
						label="Woreda"
						category="owningCollection"
						items={filterOptions.owningCollection}
					/>
					<SliderNode
						label="Registration Date"
						category="yearRange"
						rangeData={filterOptions.yearRange}
					/>
				</Accordion>
			</CardContent>
		</Card>
	);
}
