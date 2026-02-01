const CollectionsGrid = ({
    collections,
    onCollectionClick,
    selectedCollections,
}) => {
    const defaultCollections = [
        { name: "E-Manuscript", description: "Browse E-Manuscript" },
        { name: "E-Microfilms", description: "Browse E-Microfilms" },
        { name: "E-Archives", description: "Browse E-Archives" },
    ];

    const isCollectionSelected = (collection) => {
        const collectionId = collection.uuid || collection.id;
        return selectedCollections.some((c) => (c.uuid || c.id) === collectionId);
    };

    return (
        <div className="flex justify-center">
            <div className="grid gap-6 pb-8 scrollbar-hide snap-x" style={{
                gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
                gridAutoFlow: 'column',
                gridAutoColumns: '320px',
                justifyContent: 'center'
            }}>
                {collections && collections.length > 0
                    ? collections.map((col, idx) => {
                        const isSelected = isCollectionSelected(col);

                        // Simple helper to extract metadata values
                        const getMeta = (key) => col.metadata?.[key]?.[0]?.value || "";

                        const name = col.name || getMeta("dc.title") || "Collection";
                        const abstract = getMeta("dc.description.abstract");

                        // Use local images from public/images
                        let imageUrl = "/images/book.jpg";
                        const lowerName = name.toLowerCase();
                        if (lowerName.includes("manuscript")) {
                            imageUrl = "/images/Manuscript.jpg";
                        } else if (lowerName.includes("microfilm") || lowerName.includes("film")) {
                            imageUrl = "/images/Microfilms.jpg";
                        } else if (lowerName.includes("archive")) {
                            imageUrl = "/images/Archive.jpg";
                        } else if (lowerName.includes("magazine") || lowerName.includes("journal")) {
                            imageUrl = "/images/Magazine.jpg";
                        } else if (lowerName.includes("news")) {
                            imageUrl = "/images/News.jpg";
                        }

                        return (
                            <button
                                key={col.uuid || col.id || idx}
                                onClick={() => onCollectionClick(col)}
                                className={`snap-start border rounded-2xl overflow-hidden text-left transition-all flex flex-col h-full bg-white cursor-pointer border-gray-100`}
                            >
                                <div className="h-44 w-full overflow-hidden relative">
                                    <img
                                        src={imageUrl}
                                        alt={name}
                                        className="w-full h-full object-cover"
                                    />
                                    {isSelected && (
                                        <div className="absolute top-3 right-3 bg-white text-blue-900 rounded-full p-1 shadow-md z-10 scale-125 border border-blue-100">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                <div className="p-5 flex-1 flex flex-col bg-white">
                                    <h3 className="text-base font-black text-[#0C2B4E] mb-2 line-clamp-2 uppercase tracking-tight leading-tight">
                                        {name}
                                    </h3>

                                    {abstract && (
                                        <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed font-medium">
                                            {abstract.replace(/<[^>]*>/g, '')}
                                        </p>
                                    )}
                                </div>
                            </button>
                        );
                    })
                    : defaultCollections.map((item, idx) => (
                        <button
                            key={`${item.name}-${idx}`}
                            onClick={() => onCollectionClick(item)}
                            className="snap-start border border-gray-100 rounded-2xl p-6 text-left transition-all bg-white cursor-pointer"
                        >
                            <h3 className="text-lg font-black text-gray-900 mb-2 uppercase tracking-tight">
                                {item.name}
                            </h3>
                            <p className="text-sm text-gray-500 font-medium">{item.description}</p>
                        </button>
                    ))}
            </div>
        </div>
    );
};

export default CollectionsGrid;
