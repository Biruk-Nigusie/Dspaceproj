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

            const newToken =
                response.headers.get("DSPACE-XSRF-TOKEN") ||
                response.headers.get("XSRF-TOKEN") ||
                response.headers.get("X-XSRF-TOKEN");
            if (newToken) {
                this.csrfToken = newToken;
            }

            const authHeader =
                response.headers.get("Authorization") ||
                response.headers.get("authorization");
            if (authHeader) {
                this.authToken = authHeader;
            }

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

    async checkAuthStatus() {
        try {
            // Ensure we have a CSRF token even on first load
            if (!this.csrfToken) {
                await this.getCsrfToken();
            }

            const token = this.getStoredToken();
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

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
            const raw = localStorage.getItem("dspaceAuthToken");
            if (raw) return raw;
        } catch (e) { }
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
        add("dc.language.iso", metadata.language);
        add("dc.identifier.isbn", metadata.isbn);
        add("dc.identifier.issn", metadata.issn);
        add("dc.rights", metadata.rights);
        add("dc.identifier.uri", metadata.uri);
        add("dc.type", metadata.type);
        // .....................
        add("legal.bench.session", metadata.benchSession);
        add("legal.case.complaintNumber", metadata.complaintNumber);
        add("legal.case.fileNumber", metadata.fileNumber);
        add("legal.case.type", metadata.caseType);
        add("legal.case.level", metadata.caseLevel);
        add("legal.document.type", metadata.documentType);
        add("legal.judge.number", metadata.judgeNumber);
        add("legal.location", metadata.location);

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

            if (response.ok || response.status === 201) {
                return await response.json();
            }
            throw new Error(`Workspace item creation failed: ${response.status}`);
        } catch (error) {


            throw error;
        }
    }

    async updateMetadata(workspaceItemId, metadata) {
        try {
            const token = this.getStoredToken();
            const baseHeaders = this.getCsrfHeaders({
                "Content-Type": "application/json-patch+json",
                Accept: "application/json",
            });
            if (token) {
                baseHeaders["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const metadataUpdates = [];
            const author = metadata.author || [];
            const subjectKeywords = metadata.subjectKeywords || [];
            const otherTitles = metadata.otherTitles || [];
            const dateIssued = metadata.dateIssued || metadata.publicationDate || "";

            const dcFields = {
                "dc.title": metadata.title,
                "dc.contributor.author": author,
                "dc.title.alternative": otherTitles,
                "dc.subject": subjectKeywords,
                "dc.description.abstract": metadata.abstract,
                "dc.description": metadata.description,
                "dc.description.sponsorship": metadata.sponsors,
                "dc.publisher": metadata.publisher,
                // "dc.identifier.citation": metadata.citation,
                // "dc.identifier.govdoc": metadata.reportNo,
                // "dc.identifier.other": metadata.reportNo,
                // "dc.relation.ispartofseries": metadata.series,
                "dc.date.issued": dateIssued,
                "dc.language.iso": metadata.language,
                "dc.type": metadata.type,
                "legal.bench.session": metadata.benchSession,
                "legal.case.complaintNumber": metadata.complaintNumber,
                "legal.case.fileNumber": metadata.fileNumber,
                "legal.case.type": metadata.caseType,
                "legal.case.level": metadata.caseLevel,
                "legal.document.type": metadata.documentType,
                "legal.judge.number": metadata.judgeNumber,
                "legal.location": metadata.location,
            };

            for (const [field, raw] of Object.entries(dcFields)) {
                if (!raw) continue;
                const vals = Array.isArray(raw) ? raw : [raw];
                const cleaned = vals.map((v) => String(v).trim()).filter(Boolean);

                if (cleaned.length > 0) {
                    // We'll map to the correct section in the batch step
                    metadataUpdates.push({
                        op: "replace",
                        path: field,
                        value: cleaned.map(v => ({ value: v }))
                    });
                }
            }

            if (metadataUpdates.length === 0) return true;

            const FIELD_SECTION_MAP = {
                "dc.subject": "traditionalpagetwo",
                "dc.description.abstract": "traditionalpagetwo",
                "dc.description": "traditionalpagetwo",
                "dc.description.sponsorship": "traditionalpagetwo",
            };

            const fieldExists = (sections, section, field) =>
                !!sections?.[section]?.fields?.[field];


            // DSpace 9 Debug Strategy: Send fields one by one to find the culprit
            console.log("DSpace 9: Starting step-by-step metadata update to find the failing field...");

            const results = [];
            for (const update of metadataUpdates) {
                const field = update.path;
                const section = FIELD_SECTION_MAP[field] || "traditionalpageone";

                // DSpace 7/8/9 value format: [{ value: "...", language: "..." }]
                // We default to the form's language if available
                const patchOp = {
                    op: "add",
                    path: `/sections/${section}/${field}`,
                    value: update.value.map(v => ({
                        value: v.value,
                        language: null,
                        authority: null,
                        confidence: -1
                    }))

                };

                try {
                    const response = await fetch(`${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}`, {
                        method: "PATCH",
                        headers: baseHeaders,
                        credentials: "include",
                        body: JSON.stringify([patchOp]),
                    });

                    if (!response.ok) {
                        let errorMsg = `Field ${field} failed (${response.status})`;
                        try {
                            const errorObj = await response.json();
                            if (errorObj.message) {
                                errorMsg += `: ${errorObj.message}`;
                            }
                        } catch (e) { }
                        console.error(`- Error patching ${field}:`, errorMsg);
                        results.push({ field, success: false, error: errorMsg });
                    } else {
                        console.log(`- Successfully patched ${field}`);
                        results.push({ field, success: true });
                    }
                } catch (e) {
                    console.error(`- Critical error on ${field}:`, e.message);
                    results.push({ field, success: false, error: e.message });
                }
            }

            const failures = results.filter(r => !r.success);
            if (failures.length > 0) {
                const failureDetails = failures.map(f => `${f.field}: ${f.error}`).join("\n");
                throw new Error(`Metadata update partially failed:\n${failureDetails}`);
            }

            return true;
        } catch (error) {
            console.error("DSpace updateMetadata error:", error);
            throw error;
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

            if (response.ok) {
                const data = await response.json();
                console.log("DSpace 9 Upload Response (WorkspaceItem):", data);

                // In DSpace 9, the response is the WorkspaceItem. 
                // The bitstream info is inside sections.upload.files
                const files = data.sections?.upload?.files;
                if (files && files.length > 0) {
                    // The most recently uploaded file is usually the last one
                    const latestFile = files[files.length - 1];
                    console.log("Extracted Bitstream UUID:", latestFile.uuid);
                    return latestFile;
                }
                return data;
            } else {
                const errorText = await response.text().catch(() => "No error body");
                console.error(`Upload failed with status ${response.status}:`, errorText);
            }
            return null;
        } catch (error) {
            console.error("Critical error in uploadFile:", error);
            return null;
        }
    }

    async updateBitstreamMetadata(bitstreamUuid, label) {
        try {
            const token = this.getStoredToken();
            const headers = this.getCsrfHeaders({
                "Content-Type": "application/json-patch+json",
                Accept: "application/json",
            });
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            // Standard DSpace 7/8/9 BITSTREAM metadata update via PATCH
            // We use dc.description to store the 'label' since it's a standard field
            const patch = [
                {
                    op: "add",
                    path: "/metadata/dc.description",
                    value: [{ value: label, language: null, authority: null, confidence: -1 }]
                }
            ];

            const url = `${DSPACE_API_URL}/core/bitstreams/${bitstreamUuid}`;
            console.log(`DSpace 9: Patching bitstream metadata at ${url}`);

            const response = await fetch(url, {
                method: "PATCH",
                credentials: "include",
                headers: headers,
                body: JSON.stringify(patch),
            });

            if (!response.ok) {
                console.error(`Failed to update bitstream metadata: ${response.status}`);
            }
            return response.ok;
        } catch (error) {
            console.error("Error updating bitstream metadata:", error);
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

            const id = typeof workspaceItemId === 'object' ? (workspaceItemId.id || workspaceItemId.uuid) : workspaceItemId;
            const workspaceUri = `${window.location.protocol}//${window.location.host}/server/api/submission/workspaceitems/${id}`;

            const response = await fetch(`${DSPACE_API_URL}/workflow/workflowitems`, {
                method: "POST",
                credentials: "include",
                headers: headers,
                body: workspaceUri,
            });

            if (response.ok || response.status === 201 || response.status === 202) {
                return await response.json().catch(() => ({ id: workspaceItemId }));
            }
            throw new Error(`Submission failed: ${response.status}`);
        } catch (error) {
            throw error;
        }
    }

    async searchItems(query, limit = 100) {
        try {
            // Add embed=owningCollection to get collection details in one request
            const params = new URLSearchParams({
                query: query || "*",
                page: "0",
                size: String(limit),
                embed: "owningCollection"
            });
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
}

export default new DSpaceService();
