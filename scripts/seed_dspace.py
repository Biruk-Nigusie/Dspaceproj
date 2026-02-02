import requests
import getpass
import sys

# --- Default Values ---
DEFAULT_BASE_URL = "http://localhost:8080/server/api"
DEFAULT_EMAIL = "admin@dspace.com"
DEFAULT_PASSWORD = "1234"

DEFAULT_SUBMITTER_EMAIL = "submitter@dspace.com"
DEFAULT_CASE_WORKER_EMAIL = "case.worker@dspace.com"
DEFAULT_REVIEWER_EMAIL = "reviewer@dspace.com"
DEFAULT_EDITOR_EMAIL = "editor@dspace.com"

# Sub cities with woreda counts
SUB_CITIES = {
    "Addis_Ketema": 10,
    "Akaky_Kaliti": 12,
    "Arada": 12,
    "Bole": 14,
    "Gullele": 11,
    "Kirkos": 12,
    "Kolfe_Keranio": 15,
    "Lideta": 10,
    "Nifas_Silk_Lafto": 12,
    "Yeka": 13,
}


class DSpaceClient:
    def __init__(self, base_url):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})

    def _handle_error(self, response):
        """Extracts error messages from DSpace JSON responses."""
        try:
            data = response.json()
            message = data.get("message", response.text)
        except Exception:
            message = response.text
        print(f"❌ Error {response.status_code}: {message}")
        sys.exit(1)

    def get_csrf(self):
        """Acquires the initial CSRF token and cookie."""
        r = self.session.get(f"{self.base_url}/security/csrf")
        r.raise_for_status()

        token = r.headers.get("DSPACE-XSRF-TOKEN")
        if not token or "DSPACE-XSRF-COOKIE" not in self.session.cookies:
            raise RuntimeError("Failed to acquire CSRF state from DSpace.")

        # Sync the session header for the next request
        self.session.headers.update({"X-XSRF-TOKEN": token})
        return token

    def login(self, email, password):
        """Authenticates and handles JWT/CSRF rotation."""
        self.get_csrf()

        data = {"user": email, "password": password}
        # Note: We don't need to pass headers manually; self.session has the X-XSRF-TOKEN
        r = self.session.post(
            f"{self.base_url}/authn/login",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if not r.ok:
            self._handle_error(r)

        # 1. Capture JWT
        auth_header = r.headers.get("Authorization")
        if auth_header:
            self.session.headers.update({"Authorization": auth_header})

        # 2. Capture Rotated CSRF (DSpace changes this after login)
        new_csrf = r.headers.get("DSPACE-XSRF-TOKEN")
        if new_csrf:
            self.session.headers.update({"X-XSRF-TOKEN": new_csrf})

        return True

    def verify_auth(self):
        """Checks status and fetches user email from the eperson link."""
        r = self.session.get(f"{self.base_url}/authn/status")
        if not r.ok:
            return None

        data = r.json()
        if not data.get("authenticated"):
            return None

        # Follow the HAL link to get user details (email)
        eperson_url = data.get("_links", {}).get("eperson", {}).get("href")
        if eperson_url:
            user_res = self.session.get(eperson_url)
            if user_res.ok:
                return user_res.json().get("email")

        return "Authenticated (Email hidden/unavailable)"

    def get_top_communities(self):
        """Fetches all top-level communities (those without parents)."""
        # We use a large size to get as many as possible in one call
        url = f"{self.base_url}/core/communities/search/top"
        r = self.session.get(url, params={"size": 100})

        if r.ok:
            # DSpace 7 returns objects inside _embedded.communities
            return r.json().get("_embedded", {}).get("communities", [])
        return []

    def delete_all_groups(self):
        """
        Deletes all non-system groups.
        System groups (Anonymous, Administrator, etc.) are skipped.
        """
        print("⚠️  Preparing to delete ALL custom groups...")

        r = self.session.get(f"{self.base_url}/eperson/groups", params={"size": 1000})
        if not r.ok:
            self._handle_error(r)

        groups = r.json().get("_embedded", {}).get("groups", [])

        protected = {"anonymous", "administrator", "administrators"}

        for group in groups:
            name = group.get("name", "").lower()

            if name in protected:
                print(f"   └── 🔒 Skipping system group: {group['name']}")
                continue

            res = self.session.delete(group["_links"]["self"]["href"])
            if res.status_code == 204:
                print(f"   └── 🗑️  Deleted group: {group['name']}")
            else:
                print(f"   └── ❌ Failed deleting {group['name']}: {res.status_code}")

    def delete_all_communities(self):
        """Finds every top-level community and deletes it."""
        print("⚠️  Preparing to delete ALL communities...")
        communities = self.get_top_communities()

        if not communities:
            print("ℹ️  No communities found to delete.")
            return

        for comm in communities:
            name = comm.get("name", "Unknown")
            uuid = comm.get("uuid")

            # DELETE call to the specific community URI
            delete_url = f"{self.base_url}/core/communities/{uuid}"
            res = self.session.delete(delete_url)

            if res.status_code == 204:
                print(f"🗑️  Deleted Community: {name} ({uuid})")
            else:
                print(f"❌ Failed to delete {name}: {res.status_code}")

    def create_community(self, name):
        """Creates a top-level community for the Sub-city."""
        payload = {
            "name": name,
            "metadata": {"dc.title": [{"value": name, "language": "en"}]},
        }
        r = self.session.post(f"{self.base_url}/core/communities", json=payload)
        if r.status_code == 201:
            uuid = r.json().get("uuid")
            print(f"🏘️  Community Created: {name} (UUID: {uuid})")
            return uuid
        return self._handle_error(r)

    def get_anonymous_group_id(self):
        """
        Search for the 'Anonymous' group using the metadata search endpoint.
        Returns the UUID of the Anonymous group.
        """
        query = "Anonymous"
        r = self.session.get(
            f"{self.base_url}/eperson/groups/search/byMetadata", params={"query": query}
        )
        r.raise_for_status()

        groups = r.json().get("_embedded", {}).get("groups", [])
        if not groups:
            raise RuntimeError("Anonymous group not found")

        return groups[0]["uuid"]

    def remove_anonymous_access_from_collection(self, collection_uuid):
        """
        Remove all explicit Anonymous access policies from a collection
        using the group-based resourcepolicies search endpoint.
        """
        # 1️⃣ Get the Anonymous group UUID
        anon_group_id = self.get_anonymous_group_id()

        # 2️⃣ Get all resource policies for this group and this collection
        r = self.session.get(
            f"{self.base_url}/authz/resourcepolicies/search/group",
            params={
                "uuid": anon_group_id,  # the group benefiting from the policies
                "resource": collection_uuid,  # optional: filter by resource
            },
        )
        r.raise_for_status()

        policies = r.json().get("_embedded", {}).get("resourcepolicies", [])

        # 3️⃣ Delete each policy
        for policy in policies:
            del_url = policy["_links"]["self"]["href"]
            res = self.session.delete(del_url)
            if res.status_code not in (200, 204):
                self._handle_error(res)

        print("     └── 🔒 Anonymous access removed from collection")

    def create_group(self, name):
        payload = {"name": name}
        r = self.session.post(f"{self.base_url}/eperson/groups", json=payload)
        if r.status_code == 201:
            print(f"     └── 👥 Group created: {name}")
            return r.json()["uuid"]
        return self._handle_error(r)

    def add_users_to_group(self, group_uuid, users_email: list[str]):
        for user_email in users_email:
            r = self.session.get(
                f"{self.base_url}/eperson/epersons/search/byEmail",
                params={"email": user_email},
            )
            if not r.ok:
                self._handle_error(r)

            user_url = r.json()["_links"]["self"]["href"]

            res = self.session.post(
                f"{self.base_url}/eperson/groups/{group_uuid}/epersons",
                data=user_url,
                headers={"Content-Type": "text/uri-list"},
            )

            if res.status_code != 204:
                self._handle_error(res)

    def grant_read(self, group_uuid, resource_uuid, resource_type):
        payload = {
            "action": "READ",
            "resourceType": resource_type,
            "resource": resource_uuid,
            "group": group_uuid,
        }

        r = self.session.post(
            f"{self.base_url}/authz/resourcepolicies?resource={resource_uuid}&group={group_uuid}",
            json=payload,
        )
        if r.status_code not in (200, 201):
            self._handle_error(r)

    def grant_collection_read_cascade(self, group_uuid, collection_uuid):
        # Collection READ
        self.grant_read(group_uuid, collection_uuid, "COLLECTION")

        # Item + bitstream template policies
        payload = {
            "action": "READ",
            "group": group_uuid,
        }

        r = self.session.post(
            f"{self.base_url}/core/collections/{collection_uuid}/itemtemplate",
            json=payload,
        )
        if r.status_code not in (200, 201):
            self._handle_error(r)

        print("     └── 🔐 READ granted on collection + future items/bitstreams")

    def activate_roles(self, collection_uuid):
        """Activates Admin, Submitter, Item Read, Bitstream Read, and Workflow roles."""
        # Standard roles
        role_endpoints = [
            "adminGroup",
            "submittersGroup",
            "itemReadGroup",
            "bitstreamReadGroup",
        ]

        # Standard DSpace workflow steps
        workflow_roles = ["reviewer", "editor"]

        # We POST an empty body to these endpoints to trigger internal group creation
        for role in role_endpoints:
            url = f"{self.base_url}/core/collections/{collection_uuid}/{role}"
            res = self.session.post(url, json={})
            if res.status_code not in [200, 201]:
                self._handle_error(res)

        for role in workflow_roles:
            url = f"{self.base_url}/core/collections/{collection_uuid}/workflowGroups/{role}"
            res = self.session.post(url, json={})
            if res.status_code not in [200, 201]:
                self._handle_error(res)

        print("     └── 🛡️  Roles & Workflow Groups Activated")

    def add_users_to_collection_groups(
        self,
        collection_uuid: str,
        collection_name: str,
        submitter_email: str = None,
        case_worker_email: str = None,
        reviewer_email: str = None,
        editor_email: str = None,
    ):
        """
        Add users to the standard collection groups:
        - submittersGroup -> submitter_email
        - itemReadGroup & bitstreamReadGroup -> case_worker_email
        - reviewer workflow group -> reviewer_email
        - editor workflow group -> editor_email
        """

        # Mapping of DSpace group endpoints to the email to add
        group_mapping = {
            "submittersGroup": [submitter_email],
            "itemReadGroup": [submitter_email, case_worker_email, editor_email],
            "bitstreamReadGroup": [submitter_email, case_worker_email, editor_email],
            "workflowGroups/reviewer": [reviewer_email],
            "workflowGroups/editor": [editor_email],
        }

        for endpoint, emails in group_mapping.items():
            if not emails:
                continue  # skip if no email provided

            # 1️⃣ Get the group UUID for this collection endpoint
            url = f"{self.base_url}/core/collections/{collection_uuid}/{endpoint}"
            r = self.session.get(url)
            if not r.ok:
                self._handle_error(r)
            group_uuid = r.json().get("uuid")
            if not group_uuid:
                print(f"⚠️ Could not find group for {endpoint}, skipping...")
                continue

            for email in emails:
                # 2️⃣ Search for the user by email
                user_search = self.session.get(
                    f"{self.base_url}/eperson/epersons/search/byEmail",
                    params={"email": email},
                )
                if not user_search.ok:
                    self._handle_error(user_search)

                user_data = user_search.json()
                if not user_data or "uuid" not in user_data:
                    print(f"⚠️ User {email} not found, skipping...")
                    continue
                user_url = user_data["_links"]["self"]["href"]

                # 3️⃣ Add user to the group
                add_url = f"{self.base_url}/eperson/groups/{group_uuid}/epersons"
                res = self.session.post(
                    add_url,
                    data=user_url,
                    headers={"Content-Type": "text/uri-list"},
                )

                if res.status_code in [204]:
                    print(f"     └── ✅ Added {email} to {endpoint}")
                else:
                    self._handle_error(res)

        read_group_name = f"{collection_name}_READ"

        group_uuid = self.create_group(read_group_name)
        self.add_users_to_group(
            group_uuid, [case_worker_email, submitter_email, editor_email]
        )
        self.grant_collection_read_cascade(group_uuid, collection_uuid)

        print(f"     └── 👮 Case worker added to {read_group_name}")

    def create_collection(self, parent_uuid, name):
        """Creates a collection for the Woreda within a Community."""
        payload = {
            "name": name,
            "metadata": {"dc.title": [{"value": name, "language": "en"}]},
        }
        # DSpace 7 uses a query parameter 'parent' to link the collection to the community
        r = self.session.post(
            f"{self.base_url}/core/collections",
            json=payload,
            params={"parent": parent_uuid},
        )
        if r.status_code == 201:
            coll_uuid = r.json().get("uuid")
            print(f"   └── 📁 Collection Created: {name}")

            self.remove_anonymous_access_from_collection(coll_uuid)
            self.activate_roles(coll_uuid)

            return coll_uuid
        return self._handle_error(r)


def main():
    print("🔐 DSpace API Authentication")

    # User Inputs
    base_url = input(f"Base URL [{DEFAULT_BASE_URL}]: ").strip() or DEFAULT_BASE_URL
    email = input(f"Email [{DEFAULT_EMAIL}]: ").strip() or DEFAULT_EMAIL
    password = getpass.getpass(f"Password for {email}: ") or DEFAULT_PASSWORD

    submitter_email = (
        input(f"Submitter Email: [{DEFAULT_SUBMITTER_EMAIL}]: ").strip()
        or DEFAULT_SUBMITTER_EMAIL
    )
    case_worker_email = (
        input(f"Case Worker Email: [{DEFAULT_CASE_WORKER_EMAIL}]: ").strip()
        or DEFAULT_CASE_WORKER_EMAIL
    )
    reviewer_email = (
        input(f"Reviewer Email: [{DEFAULT_REVIEWER_EMAIL}]: ").strip()
        or DEFAULT_REVIEWER_EMAIL
    )
    editor_email = (
        input(f"Editor Email: [{DEFAULT_EDITOR_EMAIL}]: ").strip()
        or DEFAULT_EDITOR_EMAIL
    )

    client = DSpaceClient(base_url)

    try:
        print("📡 Connecting and fetching CSRF...")
        client.login(email, password)

        print("🔍 Verifying session...")
        user_email = client.verify_auth()

        if user_email:
            print(f"✅ Successfully authenticated as: {user_email}")
            print("-" * 30)
            print("🚀 Session is ready for API operations.")

            # Optional cleanup
            cleanup = input(
                "\nDo you want to DELETE all existing communities before seeding? (y/n): "
            ).lower()
            if cleanup == "y":
                client.delete_all_communities()
                print("✨ Environment wiped clean.\n")

            cleanup_groups = input(
                "\nDo you want to DELETE all existing custom groups? (y/n): "
            ).lower()

            if cleanup_groups == "y":
                client.delete_all_groups()
                print("✨ Groups wiped clean.\n")

            # --- START SEED LOGIC ---
            print("\n🏗️  Starting DSpace Structure Seeding for Addis Ababa...")

            for sub_city, woreda_count in SUB_CITIES.items():
                community_uuid = client.create_community(sub_city)

                if community_uuid:
                    for i in range(1, woreda_count + 1):
                        # Formatting: name_of_sub_city_woreda_number (e.g., Bole_Woreda_05)
                        woreda_name = f"{sub_city}_Woreda_{str(i).zfill(2)}"
                        coll_uuid = client.create_collection(
                            community_uuid, woreda_name
                        )

                        client.add_users_to_collection_groups(
                            coll_uuid,
                            woreda_name,
                            submitter_email,
                            case_worker_email,
                            reviewer_email,
                            editor_email,
                        )

            print("\n✅ Seeding complete!")
            # --- END SEED LOGIC ---
        else:
            print("⚠️ Login appeared successful, but session is unauthenticated.")

    except requests.exceptions.RequestException as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
