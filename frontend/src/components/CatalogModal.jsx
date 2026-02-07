import { useState } from 'react';
import { X, BookPlus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { catalogItem } from '../services/kohaService';

const CatalogModal = ({ resource, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Extract DSpace UUID from resource ID
    // The resource.id is in format: dspace_<uuid>
    const dspaceUuid = resource.id?.replace('dspace_', '') || resource.uuid || '';
    console.log('Cataloging DSpace item with UUID:', dspaceUuid, 'from resource:', resource);

    // Form state
    const [formData, setFormData] = useState({
        barcode: '',
        home_library_id: 'CPL',
        item_type_id: 'BOOK',
        call_number: '',
        copy_number: 1,
        notes: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Validate barcode
            if (!formData.barcode.trim()) {
                throw new Error('Barcode is required');
            }

            // Catalog the item
            const result = await catalogItem(dspaceUuid, formData);

            setSuccess(true);

            // Wait a moment to show success message, then close
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess(result);
                }
                onClose();
            }, 1500);

        } catch (err) {
            setError(err.message || 'Failed to catalog item');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl relative animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
                    <h3 className="text-xl font-black text-indigo-900 tracking-tight flex items-center gap-2">
                        <BookPlus size={20} /> Catalog Item to Koha
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-indigo-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                        disabled={loading}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6">
                    {/* Bibliographic Information (Read-only preview) */}
                    <div className="mb-6 pb-6 border-b border-gray-200">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
                            Bibliographic Information
                        </h4>
                        <div className="bg-gray-50 p-4 rounded-sm space-y-2">
                            <div>
                                <span className="text-xs font-bold text-gray-400 uppercase">Title:</span>
                                <p className="text-sm font-medium text-gray-800">{resource.title}</p>
                            </div>
                            {resource.authors && (
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase">Author:</span>
                                    <p className="text-sm font-medium text-gray-800">{resource.authors}</p>
                                </div>
                            )}
                            {resource.year && (
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase">Year:</span>
                                    <p className="text-sm font-medium text-gray-800">{resource.year}</p>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2 italic">
                            This metadata will be automatically converted to MARC21 format
                        </p>
                    </div>

                    {/* Physical Item Details */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                            Physical Item Details
                        </h4>

                        {/* Barcode */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Barcode <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="barcode"
                                value={formData.barcode}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Enter barcode"
                                required
                                disabled={loading || success}
                            />
                        </div>

                        {/* Library and Item Type */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Home Library
                                </label>
                                <select
                                    name="home_library_id"
                                    value={formData.home_library_id}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    disabled={loading || success}
                                >
                                    <option value="CPL">Centerville Public Library</option>
                                    <option value="MPL">Main Public Library</option>
                                    <option value="FPL">Fairview Public Library</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Item Type
                                </label>
                                <select
                                    name="item_type_id"
                                    value={formData.item_type_id}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    disabled={loading || success}
                                >
                                    <option value="BOOK">Book</option>
                                    <option value="REF">Reference</option>
                                    <option value="AV">Audio/Visual</option>
                                    <option value="MAG">Magazine</option>
                                    <option value="ARCH">Archive</option>
                                </select>
                            </div>
                        </div>

                        {/* Call Number */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Call Number
                            </label>
                            <input
                                type="text"
                                name="call_number"
                                value={formData.call_number}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="e.g., 123.45 ABC"
                                disabled={loading || success}
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Notes (Optional)
                            </label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Add any notes about this physical item"
                                disabled={loading || success}
                            />
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-sm flex items-start gap-2">
                            <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-sm flex items-start gap-2">
                            <CheckCircle2 size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-green-700 font-medium">
                                Item successfully cataloged to Koha!
                            </p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm font-bold uppercase tracking-widest rounded-sm hover:bg-gray-50 transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold uppercase tracking-widest rounded-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading || success}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Cataloging...
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle2 size={18} />
                                    Cataloged
                                </>
                            ) : (
                                <>
                                    <BookPlus size={18} />
                                    Catalog Item
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CatalogModal;
