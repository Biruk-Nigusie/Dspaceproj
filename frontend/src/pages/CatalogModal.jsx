import React from 'react';

const InputField = ({ label, value, field, type = "text", required = false, placeholder = "", onCatalogDataChange }) => (
    <div className="flex flex-col">
        <label className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-tight flex items-center">
            {label} {required && <span className="text-red-500 ml-1">★</span>}
        </label>
        <input
            type={type}
            value={value || ""}
            onChange={(e) => onCatalogDataChange(field, e.target.value)}
            className={`p-2 border rounded text-sm transition-all ${required ? 'border-blue-200 focus:ring-2 focus:ring-blue-500' : 'border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'} outline-none bg-white`}
            placeholder={placeholder}
            required={required}
        />
    </div>
);

const SelectField = ({ label, value, field, options, required = false, onCatalogDataChange }) => (
    <div className="flex flex-col">
        <label className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-tight flex items-center">
            {label} {required && <span className="text-red-500 ml-1">★</span>}
        </label>
        <select
            value={value || ""}
            onChange={(e) => onCatalogDataChange(field, e.target.value)}
            className={`p-2 border rounded text-sm transition-all ${required ? 'border-blue-200 focus:ring-2 focus:ring-blue-500' : 'border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'} outline-none bg-white`}
            required={required}
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

const CatalogModal = ({
    isOpen,
    onClose,
    catalogData,
    onCatalogDataChange,
    onSubmit,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#0C1E32]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">
                {/* Header */}
                <div className="bg-white border-b border-gray-100 px-8 py-5 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-gray-900">Koha Cataloging</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        onSubmit();
                    }}
                    className="flex-1 overflow-y-auto flex flex-col bg-gray-50/30"
                >
                    <div className="p-8 space-y-8 flex-1">
                        {/* ESSENTIAL FIELDS */}
                        <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                            <h3 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-widest flex items-center gap-2">
                                <span className="bg-blue-600 text-white p-1 rounded">01</span> Essential Fields
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                <InputField label="Title" value={catalogData.title} field="title" required onCatalogDataChange={onCatalogDataChange} />
                                <InputField label="Author / Creator" value={catalogData.authors} field="authors" required placeholder="Last Name, First Name" onCatalogDataChange={onCatalogDataChange} />
                                <div className="md:col-span-2">
                                    <InputField label="Resource URL" value={catalogData.dspace_url} field="dspace_url" required type="url" placeholder="https://..." onCatalogDataChange={onCatalogDataChange} />
                                </div>
                                <SelectField
                                    label="Resource Type"
                                    value={catalogData.resource_type}
                                    field="resource_type"
                                    required
                                    onCatalogDataChange={onCatalogDataChange}
                                    options={[
                                        { value: "eBook", label: "eBook" },
                                        { value: "eJournal", label: "eJournal" },
                                        { value: "Database", label: "Database" },
                                        { value: "Website", label: "Website" },
                                        { value: "Video", label: "Video" },
                                        { value: "Audio", label: "Audio" },
                                        { value: "Text", label: "Text/Document" }
                                    ]}
                                />
                                <InputField label="Publication Year" value={catalogData.year} field="year" type="number" onCatalogDataChange={onCatalogDataChange} />
                            </div>
                        </section>

                        {/* IMPORTANT FIELDS */}
                        <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                            <h3 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-widest flex items-center gap-2">
                                <span className="bg-gray-400 text-white p-1 rounded">02</span> Important Fields
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                <InputField label="Publisher" value={catalogData.publisher} field="publisher" onCatalogDataChange={onCatalogDataChange} />
                                <InputField label="ISBN / ISSN" value={catalogData.isbn_issn} field="isbn_issn" placeholder="XXX-XXXX-XXXX" onCatalogDataChange={onCatalogDataChange} />
                                <SelectField
                                    label="Language"
                                    value={catalogData.language}
                                    field="language"
                                    onCatalogDataChange={onCatalogDataChange}
                                    options={[
                                        { value: "English", label: "English" },
                                        { value: "Amharic", label: "Amharic" },
                                        { value: "Oromo", label: "Oromo" },
                                        { value: "Tigrinya", label: "Tigrinya" },
                                        { value: "French", label: "French" }
                                    ]}
                                />
                                <InputField label="Call Number" value={catalogData.call_number} field="call_number" placeholder="QA76.76.C65" onCatalogDataChange={onCatalogDataChange} />
                                <div className="md:col-span-2">
                                    <InputField label="Subject Headings" value={catalogData.subject_keywords} field="subject_keywords" placeholder="Keywords separated by commas" onCatalogDataChange={onCatalogDataChange} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-tight">Summary</label>
                                    <textarea
                                        value={catalogData.description}
                                        onChange={(e) => onCatalogDataChange("description", e.target.value)}
                                        className="w-full p-2 border border-gray-200 rounded text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none min-h-[100px] bg-white text-gray-900"
                                        placeholder="Enter brief abstract..."
                                    />
                                </div>
                            </div>
                        </section>

                        {/* ELECTRONIC RESOURCE SPECIFICS */}
                        <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-4">
                            <h3 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-widest flex items-center gap-2">
                                <span className="bg-teal-500 text-white p-1 rounded">03</span> Electronic Resource Specifics
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                                <SelectField
                                    label="Access Note"
                                    value={catalogData.access_note}
                                    field="access_note"
                                    onCatalogDataChange={onCatalogDataChange}
                                    options={[
                                        { value: "Open access", label: "Open access" },
                                        { value: "Library subscription required", label: "Subscription Required" },
                                        { value: "Free trial", label: "Free trial" },
                                        { value: "Restricted", label: "Restricted" }
                                    ]}
                                />
                                <SelectField
                                    label="Content Type"
                                    value={catalogData.content_type}
                                    field="content_type"
                                    onCatalogDataChange={onCatalogDataChange}
                                    options={[
                                        { value: "Text", label: "Text" },
                                        { value: "Image", label: "Image" },
                                        { value: "Video", label: "Video" },
                                        { value: "Software", label: "Software" },
                                        { value: "Dataset", label: "Dataset" }
                                    ]}
                                />
                                <SelectField
                                    label="Format"
                                    value={catalogData.format}
                                    field="format"
                                    onCatalogDataChange={onCatalogDataChange}
                                    options={[
                                        { value: "PDF", label: "PDF" },
                                        { value: "HTML", label: "HTML" },
                                        { value: "MP4", label: "MP4" },
                                        { value: "EPUB", label: "EPUB" },
                                        { value: "ZIP", label: "ZIP" }
                                    ]}
                                />
                            </div>
                        </section>
                    </div>

                    {/* Footer - Part of Form for submit button usage */}
                    <div className="bg-white border-t border-gray-100 px-8 py-5 flex justify-between items-center shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] sticky bottom-0 z-20">
                        <div className="text-xs font-bold text-gray-400 flex items-center gap-2">
                            <span className="text-red-500 text-lg">★</span> Required Fields for Cataloging record
                        </div>
                        <div className="flex space-x-3">
                            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-black text-gray-500 hover:text-gray-900 transition-colors tracking-widest cursor-pointer">
                                Discard
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-2.5 bg-[#0C2B4E] text-white text-sm font-black rounded-xl  cursor-pointer tracking-widest"
                            >
                                Catalog
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CatalogModal;
