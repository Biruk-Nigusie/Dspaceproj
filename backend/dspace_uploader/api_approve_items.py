#!/usr/bin/env python3
"""
DSpace REST API Workflow Approval Script
"""

import requests
import json
import time

class DSpaceAPIApprover:
    def __init__(self):
        self.base_url = "http://localhost:8080/server/api"
        self.session = requests.Session()
        self.csrf_token = None
        self.auth_token = None
        
    def get_csrf_token(self):
        """Get CSRF token"""
        try:
            response = self.session.get(f"{self.base_url}/security/csrf")
            self.csrf_token = response.headers.get('DSPACE-XSRF-TOKEN')
            return self.csrf_token is not None
        except Exception as e:
            print(f"❌ Failed to get CSRF token: {e}")
            return False
    
    def login(self, email="biruk11011@gmail.com", password="Biruk@0115439"):
        """Login to DSpace"""
        try:
            if not self.get_csrf_token():
                return False
                
            login_data = {"email": email, "password": password}
            headers = {
                "X-XSRF-TOKEN": self.csrf_token,
                "Content-Type": "application/json"
            }
            
            response = self.session.post(
                f"{self.base_url}/authn/login",
                json=login_data,
                headers=headers
            )
            
            if response.status_code == 200:
                # Get auth token from response
                auth_header = response.headers.get('Authorization')
                if auth_header:
                    self.auth_token = auth_header
                print("✅ Successfully logged in")
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                # Try alternative login format
                login_data = {"user": email, "password": password}
                response2 = self.session.post(
                    f"{self.base_url}/authn/login",
                    json=login_data,
                    headers=headers
                )
                if response2.status_code == 200:
                    print("✅ Successfully logged in (alternative format)")
                    return True
                return False
                
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def get_workflow_items(self):
        """Get all workflow items"""
        try:
            headers = {"X-XSRF-TOKEN": self.csrf_token}
            response = self.session.get(
                f"{self.base_url}/workflow/workflowitems",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                items = data.get('_embedded', {}).get('workflowitems', [])
                print(f"📊 Found {len(items)} workflow items")
                return items
            else:
                print(f"❌ Failed to get workflow items: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"❌ Error getting workflow items: {e}")
            return []
    
    def claim_item(self, item_id):
        """Claim a workflow item"""
        try:
            headers = {
                "X-XSRF-TOKEN": self.csrf_token,
                "Content-Type": "application/json"
            }
            
            response = self.session.put(
                f"{self.base_url}/workflow/workflowitems/{item_id}/step",
                json={"action": "claim"},
                headers=headers
            )
            
            if response.status_code in [200, 204]:
                print(f"     ✅ Claimed item {item_id}")
                return True
            else:
                print(f"     ❌ Failed to claim item {item_id}: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"     ❌ Error claiming item {item_id}: {e}")
            return False
    
    def approve_item(self, item_id):
        """Approve a workflow item"""
        try:
            headers = {
                "X-XSRF-TOKEN": self.csrf_token,
                "Content-Type": "application/json"
            }
            
            response = self.session.put(
                f"{self.base_url}/workflow/workflowitems/{item_id}/step",
                json={"action": "approve"},
                headers=headers
            )
            
            if response.status_code in [200, 204]:
                print(f"     ✅ Approved item {item_id}")
                return True
            else:
                print(f"     ❌ Failed to approve item {item_id}: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"     ❌ Error approving item {item_id}: {e}")
            return False
    
    def claim_and_approve_all(self):
        """Claim and approve all workflow items"""
        try:
            if not self.login():
                return False
            
            items = self.get_workflow_items()
            if not items:
                print("✅ No workflow items to process")
                return True
            
            confirm = input(f"\n🚨 CLAIM AND APPROVE {len(items)} ITEMS? (yes/no): ")
            if confirm.lower() != 'yes':
                print("❌ Operation cancelled")
                return False
            
            print(f"\n🔄 Processing {len(items)} workflow items...")
            
            claimed_count = 0
            approved_count = 0
            
            for item in items:
                item_id = item['id']
                item_name = item.get('item', {}).get('name', 'Unknown')
                
                print(f"\n📄 Processing: {item_name} (ID: {item_id})")
                
                # Step 1: Claim the item
                if self.claim_item(item_id):
                    claimed_count += 1
                    time.sleep(0.5)  # Small delay
                    
                    # Step 2: Approve the item
                    if self.approve_item(item_id):
                        approved_count += 1
                    
                time.sleep(1)  # Delay between items
            
            print(f"\n✅ COMPLETED:")
            print(f"   Claimed: {claimed_count} items")
            print(f"   Approved: {approved_count} items")
            print(f"🎉 Items are now publicly accessible!")
            
            return approved_count > 0
            
        except Exception as e:
            print(f"❌ Bulk approval failed: {e}")
            return False

def main():
    print("=" * 60)
    print("🚀 DSpace REST API Workflow Approval")
    print("=" * 60)
    
    approver = DSpaceAPIApprover()
    
    while True:
        print("\nOPTIONS:")
        print("1. Claim and approve all workflow items")
        print("2. Exit")
        
        choice = input("\nSelect option (1-2): ").strip()
        
        if choice == '1':
            approver.claim_and_approve_all()
        elif choice == '2':
            print("👋 Exiting...")
            break
        else:
            print("❌ Invalid option")

if __name__ == "__main__":
    main()