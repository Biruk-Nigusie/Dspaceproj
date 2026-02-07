// Use proxy to avoid CORS issues - proxy forwards /api/dspace to http://localhost:8080/server/api
const DSPACE_API_URL = "/api/dspace";

class DSpaceService {
    constructor() {
        this.isAuthenticated = false;
        this.authToken = null;
        this.csrfToken = null;
    }

    async getCsrfToken() {
        try {
            const response = await fetch(`${DSPACE_API_URL}/security/csrf`, {
                method: "GET",
                credentials: "include",
                headers: { Accept: "application/json" },
            });

            if (response.status !== 200 && response.status !== 204) {
                return false;
            }

            const headerNames = [
                "DSPACE-XSRF-TOKEN",
                "XSRF-TOKEN",
                "X-XSRF-TOKEN",
                "dspace-xsrf-token",
                "xsrf-token",
                "x-xsrf-token",
            ];

            for (const headerName of headerNames) {
                try {
                    const token = response.headers.get(headerName);
                    if (token) {
                        this.csrfToken = token;
                        return true;
                    }
                } catch (e) { }
            }

            await new Promise((resolve) => setTimeout(resolve, 200));

            const cookies = document.cookie.split(";");
            for (const cookie of cookies) {
                const [name, value] = cookie.trim().split("=");
                if (
                    name === "DSPACE-XSRF-COOKIE" ||
                    name === "XSRF-TOKEN" ||
                    name === "DSPACE-XSRF-TOKEN"
                ) {
                    this.csrfToken = decodeURIComponent(value);
                    return true;
                }
            }

            try {
                const body = await response.json();
                if (body.token || body.csrfToken || body.xsrfToken) {
                    this.csrfToken = body.token || body.csrfToken || body.xsrfToken;
                    return true;
                }
            } catch (e) { }

            return false;
        } catch (error) {
            return false;
        }
    }

    getCsrfHeaders(additionalHeaders = {}) {
        const headers = { ...additionalHeaders };
        if (this.csrfToken) {
            headers["X-XSRF-TOKEN"] = this.csrfToken;
            headers["DSPACE-XSRF-TOKEN"] = this.csrfToken;
        }
        return headers;
    }

    async login(username, password) {
        try {
            if (!(await this.getCsrfToken())) {
                throw new Error("Failed to get CSRF token.");
            }

            const formData = new URLSearchParams();
            formData.append("user", username);
            formData.append("password", password);

            const headers = this.getCsrfHeaders({
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
            });

            const response = await fetch(`${DSPACE_API_URL}/authn/login`, {
                method: "POST",
                headers: headers,
                body: formData.toString(),
                credentials: "include",
            });

            this._updateTokens(response);

            if (response.status === 200) {
                this.isAuthenticated = true;
                return await response.json().catch(() => ({ authenticated: true }));
            }

            if (response.status === 401) {
                throw new Error("Invalid email or password.");
            }

            throw new Error(`Login failed: ${response.status}`);
        } catch (error) {
            console.error("DSpace login error:", error);
            this.isAuthenticated = false;
            throw error;
        }
    }

    _updateTokens(response) {
        if (!response) return;

        const newToken =
            response.headers.get("DSPACE-XSRF-TOKEN") ||
            response.headers.get("XSRF-TOKEN") ||
            response.headers.get("X-XSRF-TOKEN") ||
            response.headers.get("dspace-xsrf-token") ||
            response.headers.get("xsrf-token") ||
            response.headers.get("x-xsrf-token");

        if (newToken) {
            this.csrfToken = newToken;
            console.log("Updated CSRF token from response");
        }

        const authHeader =
            response.headers.get("Authorization") ||
            response.headers.get("authorization");
        if (authHeader) {
            this.authToken = authHeader;
            console.log("Updated Auth token from response");
        }
    }

    async checkAuthStatus() {
        try {
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            const response = await fetch(`${DSPACE_API_URL}/authn/status`, {
                credentials: "include",
                headers: headers,
            });

            if (response.ok) {
                const data = await response.json();
                this.isAuthenticated = data.authenticated;
                return data;
            }
            return { authenticated: false };
        } catch (error) {
            return { authenticated: false };
        }
    }

    async getCollections() {
        try {
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            const response = await fetch(`${DSPACE_API_URL}/core/collections`, {
                credentials: "include",
                headers: headers,
            });

            if (response.ok) {
                const data = await response.json();
                return data._embedded?.collections || [];
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    getStoredToken() {
        if (this.authToken) return this.authToken;
        try {
            const raw = localStorage.getItem("dsAuthInfo");
            if (raw) {
                const obj = JSON.parse(raw);
                if (obj && obj.accessToken) return obj.accessToken;
            }
        } catch (e) { }
        try {
            const m = document.cookie.match(/(?:^|;\s*)dsAuthInfo=([^;]+)/);
            if (m) {
                const decoded = decodeURIComponent(m[1]);
                const obj = JSON.parse(decoded);
                if (obj && obj.accessToken) return obj.accessToken;
            }
        } catch (e) { }
        return null;
    }

    buildMetadataListFromForm(metadata) {
        const out = [];
        const add = (key, raw) => {
            if (!raw) return;
            const vals = Array.isArray(raw) ? raw : [raw];
            for (const v of vals) {
                const value = String(v).trim();
                if (!value) continue;
                out.push({ key, value, language: null });
            }
        };
        const author = metadata.author || "";
        const dateIssued = metadata.dateIssued || metadata.publicationDate || "";

        add("dc.title", metadata.title);
        add("dc.contributor.author", author);
        add("dc.title.alternative", metadata.otherTitles);
        add("dc.subject", metadata.subjectKeywords);
        add("dc.description.abstract", metadata.abstract || metadata.description);
        add("dc.description.sponsorship", metadata.sponsors);
        add("dc.description", metadata.customField);
        add("dc.publisher", metadata.publisher);
        add("dc.identifier.citation", metadata.citation);
        add("dc.relation.ispartofseries", metadata.series);
        add("dc.identifier.other", metadata.reportNo);
        add("dc.date.issued", dateIssued);
        add("dc.language", metadata.language);
        add("dc.identifier.isbn", metadata.isbn);
        add("dc.identifier.issn", metadata.issn);
        add("dc.rights", metadata.rights);
        add("dc.identifier.uri", metadata.uri);
        add("dc.type", metadata.type);

        return out;
    }

    async createItem(collectionId, metadata) {
        const headers = this.getCsrfHeaders({
            Accept: "application/json",
            "Content-Type": "application/json",
        });

        const token = this.getStoredToken();
        if (token) {
            headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
        }

        const metadataList = this.buildMetadataListFromForm(metadata || {});
        if (!metadataList.length) {
            throw new Error("No metadata provided.");
        }

        const url1 = `${DSPACE_API_URL}/core/collections/${collectionId}/items`;
        const res1 = await fetch(url1, {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify({ metadata: metadataList }),
        });

        if (res1.ok || res1.status === 201) {
            return await res1.json();
        }

        if (res1.status === 404 || res1.status === 405) {
            const url2 = `${DSPACE_API_URL}/core/items`;
            const res2 = await fetch(url2, {
                method: "POST",
                headers,
                credentials: "include",
                body: JSON.stringify({
                    metadata: metadataList,
                    owningCollection: { uuid: collectionId },
                }),
            });

            if (res2.ok || res2.status === 201) {
                return await res2.json();
            }
        }

        throw new Error(`Failed to create item: ${res1.status}`);
    }

    async createWorkspaceItem(collectionId) {
        try {
            if (!this.csrfToken) {
                await this.getCsrfToken();
            }

            const headers = this.getCsrfHeaders({
                Accept: "application/json",
                "Content-Type": "application/json",
            });

            const token = this.getStoredToken();
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const response = await fetch(
                `${DSPACE_API_URL}/submission/workspaceitems?owningCollection=${collectionId}`,
                {
                    method: "POST",
                    headers: headers,
                    credentials: "include",
                }
            );

            this._updateTokens(response);

            if (response.ok || response.status === 201) {
                return await response.json();
            }
            throw new Error(`Workspace item creation failed: ${response.status}`);
        } catch (error) {
            throw error;
        }
    }

    async updateMetadata(workspaceItemId, metadata, collectionType = "default") {
        const groupedUpdates = {}; // { [path]: values[] }

        // Map collection types to their respective DSpace submission sections
        const TYPE_SECTION_MAP = {
            "archive": "archiveForm",
            "multimedia": "multimediaSubmission",
            "serial": "serialStep",
            "printed": "printedStep",
            "default": "traditionalpageone"
        };

        const section = TYPE_SECTION_MAP[collectionType] || "traditionalpageone";

        // Helper to collect values for grouping
        const collect = (field, raw, customSection = null) => {
            if (raw === undefined || raw === null) return;
            const vals = Array.isArray(raw) ? raw : [raw];
            const cleaned = vals.map((v) => String(v).trim()).filter(Boolean);

            if (cleaned.length > 0) {
                let actualSection = customSection || section;

                // Page two fields for traditional
                if (collectionType === "default" || collectionType === "traditional") {
                    const PAGE_TWO_FIELDS = ["dc.subject", "dc.description.abstract", "dc.description", "dc.description.sponsorship"];
                    if (PAGE_TWO_FIELDS.includes(field)) {
                        actualSection = "traditionalpagetwo";
                    }
                }

                const path = `/sections/${actualSection}/${field}`;
                if (!groupedUpdates[path]) {
                    groupedUpdates[path] = [];
                }
                groupedUpdates[path].push(...cleaned);
            }
        };

        // Type-specific fields mapping
        if (collectionType === "archive") {
            collect("dc.title", metadata.title);
            collect("dc.description.abstract", metadata.description1 || metadata.description || metadata.abstractText);
            collect("dc.subject", metadata.subjectKeywords);
            collect("dc.type.archival", metadata.archiveType);
            collect("dc.identifier.refcode", metadata.referenceCode);
            collect("local.identifier.cid", metadata.cid);
            collect("dc.coverage.temporal", metadata.temporalCoverage);
            collect("dc.date.calendartype", metadata.calendarType);
            collect("local.arrangement.level", metadata.arrangement);
            collect("local.archival.quantity", metadata.quantity);
            collect("local.archival.medium", metadata.medium);
            collect("dc.provenance", metadata.provenance);
            collect("dc.date.accessioned", metadata.accessionDate);
            collect("local.accession.means", metadata.accessionMeans);
            collect("dc.rights", metadata.accessCondition || metadata.rights);
            collect("dc.source", metadata.immediateSource);
            collect("dc.language", metadata.language);
            collect("local.archival.security", metadata.security);
            collect("local.archival.processing", metadata.processing);
        } else if (collectionType === "multimedia") {
            collect("dc.title", metadata.title);
            collect("dc.title.alternative", metadata.otherTitles);
            collect("dc.subject.other", metadata.subjectKeywords);
            collect("dc.contributor.author", metadata.authors || metadata.author);
            collect("dc.contributor.other", metadata.contributors);
            collect("dc.type", metadata.mediaType || "Multimedia");
            collect("dc.description.abstract", metadata.description || metadata.abstractText);
            collect("dc.date.created", metadata.creationDate);
            collect("dc.date.issued", metadata.dateOfIssue || metadata.dateIssued);
            collect("dc.format.medium", metadata.format);
            collect("dc.format.extent", metadata.duration);
            collect("local.resolution", metadata.resolution);
            collect("dc.format.size", metadata.fileSize);
            collect("dc.language.iso", metadata.language);
            collect("dc.publisher", metadata.publisher);
            collect("dc.relation.ispartofseries", metadata.series);
            collect("dc.rights", metadata.rights);
            collect("dc.rights.uri", metadata.license);
            collect("dc.rights.accessRights", metadata.accessLevel);
            collect("dc.description", metadata.notes);
            collect("local.identifier.cid", metadata.cid);
            collect("dc.identifier.accession", metadata.accessionNumber);
            collect("dc.contributor.composer", metadata.composers);
            collect("dc.contributor.singer", metadata.singersPerformers);
            collect("dc.type.musictype", metadata.musicType);
            collect("dc.relation.ispartof", metadata.musicAlbum);
            if (metadata.physicalDescription) {
                collect("dc.format.extent", metadata.physicalDescription);
            }
            collect("dc.subject.classification", metadata.classification);
            collect("dc.subject.instrument", metadata.instruments);
            collect("dc.coverage.spatial", metadata.placeOfPublication);
            collect("dc.provenance", metadata.acquisitionMethod);
            collect("dc.identifier.uri", metadata.relatedUrls);
            collect("dc.contributor.poemauthor", metadata.lyricists);
            collect("dc.contributor.melodyauthor", metadata.melodyAuthors);
            collect("dc.contributor.instrumentplayer", metadata.instrumentPlayers);
            collect("dc.title.subtitle", metadata.trackTitles);
            collect("local.identifier.tracknumber", metadata.trackNumber);
        } else if (collectionType === "serial") {
            collect("dc.title", metadata.title);
            collect("dc.contributor.author", metadata.authors || metadata.author);
            collect("dc.subject", metadata.subjectKeywords);
            collect("dc.identifier.class", metadata.classification);
            collect("local.office", metadata.offices);
            collect("dc.type.newspaper", metadata.newspaperType);
            collect("dc.identifier.cid", metadata.cid);
            collect("dc.identifier.accession", metadata.accessionNumber);
            collect("dc.publisher", metadata.publisher);
            collect("dc.date.issued", metadata.dateOfIssue || metadata.dateIssued);
            collect("dc.language.iso", metadata.language);
            collect("dc.relation.ispartofseries", metadata.seriesNumber || metadata.series);
            collect("dc.description.physical", metadata.physicalDescription);
            collect("dc.description.note", metadata.notes);
            collect("local.acquisition.type", metadata.typeOfAcquiring);
        } else if (collectionType === "printed") {
            collect("dc.title.prtitle", metadata.title);
            collect("dc.contributor.author", metadata.authors || metadata.author);
            collect("dc.type.itemtype", metadata.type || metadata.mediaType);
            collect("dc.date.issued", metadata.dateOfIssue || metadata.dateIssued);
            collect("dc.description.physical", metadata.physicalDescription);
            collect("dc.identifier.isbn", metadata.isbn);
            collect("dc.identifier.cid", metadata.cid);
            collect("dc.identifier.accession", metadata.accessionNumber);
            collect("dc.subject", metadata.subjectKeywords);
            collect("local.office", metadata.offices);
            collect("dc.identifier.other", metadata.attachedDocuments);
        } else {
            collect("dc.title", metadata.title);
            collect("dc.contributor.author", metadata.authors || metadata.author);
            collect("dc.date.issued", metadata.dateOfIssue || metadata.dateIssued);
            collect("dc.publisher", metadata.publisher);
            collect("dc.type", metadata.type || metadata.mediaType);
            collect("dc.language.iso", metadata.language);
            collect("dc.subject", metadata.subjectKeywords);
            collect("dc.description.abstract", metadata.abstract || metadata.description);
        }

        // Handle dynamic identifiers - Only for multimedia and default types
        if ((collectionType === "multimedia" || collectionType === "default") && metadata.identifiers && Array.isArray(metadata.identifiers)) {
            const idMap = {
                "ISSN": "dc.identifier.issn",
                "ISBN": "dc.identifier.isbn",
                "ISMN": "dc.identifier.ismn",
                "URI": "dc.identifier.uri",
                "Gov't Doc #": "dc.identifier.govdoc",
                "Other": "dc.identifier.other"
            };

            for (const idObj of metadata.identifiers) {
                const val = (idObj.value || "").trim();
                if (!val) continue;
                const field = idMap[idObj.type] || "dc.identifier.other";
                collect(field, val);
            }
        }

        const metadataUpdates = Object.entries(groupedUpdates).map(([path, values]) => {
            const uniqueValues = [...new Set(values)];
            return {
                op: "add",
                path: path,
                value: uniqueValues.map(v => ({ value: v }))
            };
        });

        if (metadataUpdates.length === 0) return true;

        try {
            const token = this.getStoredToken();
            const baseHeaders = this.getCsrfHeaders({
                "Content-Type": "application/json-patch+json",
                Accept: "application/json",
            });
            if (token) {
                baseHeaders["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            // Verify sections first
            console.log(`Verifying workspace item ${workspaceItemId} sections...`);
            const wsiResp = await fetch(`${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}`, {
                headers: { "Authorization": baseHeaders["Authorization"] },
                credentials: "include"
            });
            this._updateTokens(wsiResp);
            if (wsiResp.ok) {
                const wsi = await wsiResp.json();
                const availableSections = Object.keys(wsi.sections || {});
                console.log(`Available sections for item ${workspaceItemId}:`, availableSections);

                // If the target section isn't available, fallback to traditionalpageone
                if (section !== "traditionalpageone" && !availableSections.includes(section)) {
                    console.warn(`Target section ${section} not found. Available: ${availableSections.join(", ")}. Falling back to traditionalpageone.`);
                    metadataUpdates.forEach(update => {
                        update.path = update.path.replace(`/sections/${section}/`, "/sections/traditionalpageone/");
                    });
                }
            }

            console.log(`Sending metadata PATCH for ${collectionType} (ID: ${workspaceItemId}):`, metadataUpdates);

            const response = await fetch(`${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}`, {
                method: "PATCH",
                headers: baseHeaders,
                credentials: "include",
                body: JSON.stringify(metadataUpdates),
            });

            this._updateTokens(response);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("PATCH failed:", response.status, errorText);
                return false;
            }

            return true;
        } catch (error) {
            console.error("Error updating metadata:", error);
            return false;
        }
    }

    async uploadFile(workspaceItemId, file) {
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("name", file.name);

            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            const token = this.getStoredToken();
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const response = await fetch(
                `${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: headers,
                    body: formData,
                }
            );

            this._updateTokens(response);

            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async acceptWorkspaceLicense(workspaceItemId) {
        try {
            const headers = this.getCsrfHeaders({
                "Content-Type": "application/json-patch+json",
                Accept: "application/json",
            });
            const token = this.getStoredToken();
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const response = await fetch(
                `${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: headers,
                    body: JSON.stringify([{ op: "replace", path: "/sections/license/granted", value: true }]),
                }
            );

            this._updateTokens(response);

            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async submitWorkspaceItem(workspaceItemId) {
        try {
            const headers = this.getCsrfHeaders({
                Accept: "application/json",
                "Content-Type": "text/uri-list",
            });
            const token = this.getStoredToken();
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            let workspaceUri;
            if (typeof workspaceItemId === 'object' && workspaceItemId._links?.self?.href) {
                workspaceUri = workspaceItemId._links.self.href;
            } else {
                const id = typeof workspaceItemId === 'object' ? (workspaceItemId.id || workspaceItemId.uuid) : workspaceItemId;
                workspaceUri = `${window.location.protocol}//${window.location.host}/server/api/submission/workspaceitems/${id}`;
            }

            const response = await fetch(`${DSPACE_API_URL}/workflow/workflowitems`, {
                method: "POST",
                credentials: "include",
                headers: headers,
                body: workspaceUri,
            });

            this._updateTokens(response);

            if (response.ok || response.status === 201 || response.status === 202) {
                return await response.json().catch(() => ({ id: workspaceItemId }));
            }
            throw new Error(`Submission failed: ${response.status}`);
        } catch (error) {
            throw error;
        }
    }

    async searchItems(query, limit = 100, scope = null) {
        try {
            const params = new URLSearchParams({ query: query || "*", page: "0", size: String(limit) });
            if (scope) {
                params.append("scope", scope);
            }
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            const response = await fetch(`${DSPACE_API_URL}/discover/search/objects?${params}`, {
                credentials: "include",
                headers: headers,
            });

            if (response.ok) {
                const data = await response.json();
                return data._embedded?.searchResult?._embedded?.objects || [];
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async getItem(itemId) {
        try {
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            const response = await fetch(`${DSPACE_API_URL}/core/items/${itemId}`, {
                credentials: "include",
                headers: headers,
            });
            return response.ok ? await response.json() : null;
        } catch (error) {
            return null;
        }
    }

    async logout() {
        try {
            const headers = this.getCsrfHeaders({ "Content-Type": "application/x-www-form-urlencoded" });
            await fetch(`${DSPACE_API_URL}/authn/logout`, { method: "POST", credentials: "include", headers: headers });
        } catch (error) {
        } finally {
            this.isAuthenticated = false;
            this.authToken = null;
            this.csrfToken = null;
        }
    }

    async getHierarchy() {
        try {
            const response = await fetch("/api/resources/dspace/hierarchy/", {
                credentials: "include",
                headers: this.getCsrfHeaders({ Accept: "application/json" }),
            });
            return response.ok ? await response.json() : [];
        } catch (error) {
            console.error("Error fetching hierarchy:", error);
            return [];
        }
    }
}

export default new DSpaceService();
