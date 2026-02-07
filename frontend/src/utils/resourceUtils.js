/**
 * Utility functions for resource mapping and transformation.
 */

/**
 * Maps DSpace API item structure to the frontend internal resource format.
 */
export const mapDspaceItem = (item) => {
    const metadata = item._embedded?.indexableObject?.metadata || {};
    const getVal = (key) => metadata[key]?.[0]?.value || "";
    const getValList = (key) => metadata[key]?.map(m => m.value).join(", ") || "";

    return {
        id: item._embedded?.indexableObject?.uuid,
        title: getVal("dc.title") || getVal("dc.title.prtitle") || item._embedded?.indexableObject?.name,
        authors: getValList("dc.contributor.author"),
        year: getVal("dc.date.issued")?.substring(0, 4) || getVal("dc.date.accessioned")?.substring(0, 4),
        publisher: getVal("dc.publisher"),
        source: "dspace",
        source_name: "Digital Repository",
        collectionName: item.collectionName || "Archive",
        resource_type: getVal("dc.type.archival") || getVal("dc.type.musictype") || getVal("dc.type.newspaper") || getVal("dc.type.itemtype") || getVal("dc.type") || "Digital",
        external_id: item._embedded?.indexableObject?.handle || item._embedded?.indexableObject?.uuid,
        description: getVal("dc.description") || getVal("dc.description.abstract"),
        language: getVal("dc.language") || getVal("dc.language.iso"),
        reportNo: getVal("dc.identifier.govdoc") || getVal("dc.identifier.other"),
        subjects: getValList("dc.subject"),

        // Identifiers
        refcode: getVal("dc.identifier.refcode"),
        cid: getVal("local.identifier.cid") || getVal("dc.identifier.cid"),
        accessionNumber: getVal("dc.identifier.accession"),
        isbn: getValList("dc.identifier.isbn"),
        issn: getVal("dc.identifier.issn"),

        // Archive specific
        archivalType: getVal("dc.type.archival"),
        temporal: getVal("dc.coverage.temporal"),
        calendarType: getVal("dc.date.calendartype"),
        medium: getVal("local.archival.medium"),
        arrangement: getVal("local.arrangement.level"),
        processing: getVal("local.archival.processing"),
        security: getVal("local.archival.security"),
        provenance: getVal("dc.provenance"),
        quantity: getVal("local.archival.quantity"),
        originalSource: getVal("dc.source"),
        accessionMeans: getVal("local.accession.means"),
        rights: getVal("dc.rights"),

        // Multimedia specific
        creationDate: getVal("dc.date.created"),
        format: getVal("dc.format.medium"),
        duration: getVal("dc.format.extent"),
        musicType: getVal("dc.type.musictype"),
        composers: getVal("dc.contributor.composer"),
        singers: getVal("dc.contributor.singer"),

        // Serial/Printed specific
        newspaperType: getVal("dc.type.newspaper"),
        extent: getVal("dc.description.physical") || getVal("dc.format.extent"),
        series: getVal("dc.relation.ispartofseries"),
        citation: getVal("dc.identifier.citation"),
        classification: getVal("dc.identifier.class"),
        offices: getVal("local.office"),

        abstract: getVal("dc.description.abstract"),

        // Flags
        is_cataloged: !!item._embedded?.indexableObject?.metadata?.["local.koha.id"],
        koha_id: getVal("local.koha.id")
    };
};

/**
 * Filter resources based on active filters from the tree.
 */
export const applyTreeFilters = (resources, activeFilters) => {
    if (!activeFilters || Object.keys(activeFilters).length === 0) return resources;

    return resources.filter(resource => {
        for (const [category, selectedValues] of Object.entries(activeFilters)) {
            if (!selectedValues || selectedValues.length === 0) continue;

            let resourceValue;
            if (category === 'source') {
                resourceValue = resource.source_name || (resource.source === 'koha' ? 'Cataloged' : 'Digital');
            } else if (category === 'year') {
                resourceValue = resource.year;
            } else if (category === 'language') {
                resourceValue = resource.language === 'en' || resource.language === 'English' ? 'English' :
                    resource.language === 'am' || resource.language === 'Amharic' ? 'Amharic' : resource.language || 'Unknown';
            } else if (category === 'type') {
                resourceValue = resource.resource_type || 'Unknown';
            }

            if (!selectedValues.includes(resourceValue)) return false;
        }
        return true;
    });
};
