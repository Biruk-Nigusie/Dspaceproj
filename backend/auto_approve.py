#!/usr/bin/env python3
import requests
import json
import time

class DSpaceAPIApprover:
    def __init__(self):
        self.base_url = "http://localhost:8080/server/api"
        self.session = requests.Session()
        self.csrf_token = None
        
    def get_csrf_token(self):
        try:
            response = self.session.get(f"{self.base_url}/security/csrf")
            self.csrf_token = response.headers.get('DSPACE-XSRF-TOKEN')
            return self.csrf_token is not None
        except Exception as e:
            print(f"❌ Failed to get CSRF token: {e}")
            return False
    
    def login(self, email="biruk11011@gmail.com", password="Biruk@0115439"):
        try:
            if not self.get_csrf_token():
                return False
            login_data = {"user": email, "password": password}
            headers = {
                "X-XSRF-TOKEN": self.csrf_token,
                "Content-Type": "application/x-www-form-urlencoded"
            }
            response = self.session.post(
                f"{self.base_url}/authn/login",
                data=login_data,
                headers=headers
            )
            if response.status_code == 200:
                print("✅ Successfully logged in")
                # CRITICAL: Get Auth header and update session
                auth_header = response.headers.get('Authorization')
                if auth_header:
                    self.session.headers.update({"Authorization": auth_header})
                
                new_token = response.headers.get('DSPACE-XSRF-TOKEN')
                if new_token:
                    self.csrf_token = new_token
                    self.session.headers.update({"X-XSRF-TOKEN": self.csrf_token})
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def get_workflow_items(self):
        try:
            # Token should already be in self.session.headers
            response = self.session.get(
                f"{self.base_url}/workflow/workflowitems"
            )
            if response.status_code == 200:
                data = response.json()
                items = data.get('_embedded', {}).get('workflowitems', [])
                print(f"📊 Found {len(items)} workflow items")
                return items
            else:
                print(f"❌ Failed to get workflow items: {response.status_code} - {response.text}")
                return []
        except Exception as e:
            print(f"❌ Error getting workflow items: {e}")
            return []
    
    def approve_item(self, item_id):
        try:
            # Step 1: Claim
            claim_headers = {
                "Content-Type": "application/json"
            }
            r_claim = self.session.put(
                f"{self.base_url}/workflow/workflowitems/{item_id}/step",
                json={"action": "claim"},
                headers=claim_headers
            )
            
            # Step 2: Approve
            r_approve = self.session.put(
                f"{self.base_url}/workflow/workflowitems/{item_id}/step",
                json={"action": "approve"},
                headers=claim_headers
            )
            
            if r_approve.status_code in [200, 204]:
                print(f"     ✅ Approved item {item_id}")
                return True
            else:
                print(f"     ❌ Failed to approve item {item_id}: {r_approve.status_code} - {r_approve.text}")
                return False
        except Exception as e:
            print(f"     ❌ Error approving item {item_id}: {e}")
            return False

    def auto_approve_all(self):
        if not self.login():
            return
        
        items = self.get_workflow_items()
        if not items:
            print("Done. No items to approve.")
            return
            
        print(f"Approving {len(items)} items...")
        for item in items:
            item_id = item['id']
            self.approve_item(item_id)
            time.sleep(0.5)

if __name__ == "__main__":
    approver = DSpaceAPIApprover()
    approver.auto_approve_all()
