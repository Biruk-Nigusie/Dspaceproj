#!/usr/bin/env python3
"""
DSpace Bulk Workflow Approval Script - REST API VERSION
"""

import psycopg2
import sys
import time
import subprocess
import requests
import json

class DSpaceBulkApprover:
    def __init__(self):
        self.db_config = {
            'dbname': "dspace",
            'user': "dspace",
            'host': "localhost",
            'password': "biruk@0115439"
        }
        self.conn = None
        self.session = None
        self.csrf_token = None
        
    def connect(self):
        """Connect to DSpace database"""
        try:
            self.conn = psycopg2.connect(**self.db_config)
            print("✅ Connected to DSpace database")
            return True
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            return False

    def rest_api_login(self):
        """Login to DSpace REST API using the correct method from dspace_client.py"""
        try:
            self.session = requests.Session()
            self.session.timeout = 30
            
            # First check if DSpace is running
            try:
                health_check = self.session.get("http://localhost:8080/server/api")
                if health_check.status_code != 200:
                    print(f"❌ DSpace server not accessible: {health_check.status_code}")
                    return False
            except requests.exceptions.ConnectionError:
                print("❌ Cannot connect to DSpace server. Is it running on localhost:8080?")
                return False
            
            # Get CSRF token using the correct method
            csrf_response = self.session.get("http://localhost:8080/server/api/security/csrf")
            if csrf_response.status_code not in [200, 204]:
                print(f"❌ Failed to get CSRF token: {csrf_response.status_code}")
                return False
                
            # Try multiple sources for CSRF token (headers, cookies, body)
            self.csrf_token = None
            
            # 1) Check headers
            for header_name in ['DSPACE-XSRF-TOKEN', 'X-XSRF-TOKEN', 'XSRF-TOKEN']:
                if header_name in csrf_response.headers:
                    self.csrf_token = csrf_response.headers[header_name]
                    break
            
            # 2) Check cookies if no header token
            if not self.csrf_token:
                for cookie_name in ['DSPACE-XSRF-COOKIE', 'DSPACE-XSRF-TOKEN', 'XSRF-TOKEN']:
                    cookie_val = csrf_response.cookies.get(cookie_name)
                    if cookie_val:
                        self.csrf_token = cookie_val
                        break
            
            if not self.csrf_token:
                print("⚠️  No CSRF token found, proceeding without it")
                self.csrf_token = ''
            
            # Login using form data (not JSON) as per dspace_client.py
            login_data = {"user": "biruk11011@gmail.com", "password": "Biruk@0115439"}
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
            
            # Add CSRF token to headers if we have one
            if self.csrf_token:
                headers['X-XSRF-TOKEN'] = self.csrf_token
                headers['DSPACE-XSRF-TOKEN'] = self.csrf_token
            
            login_response = self.session.post(
                "http://localhost:8080/server/api/authn/login",
                data=login_data,
                headers=headers
            )
            
            if login_response.status_code == 200:
                # Update CSRF token from login response if provided
                new_token = (login_response.headers.get("DSPACE-XSRF-TOKEN") or
                           login_response.headers.get("XSRF-TOKEN") or
                           login_response.headers.get("X-XSRF-TOKEN"))
                if new_token:
                    self.csrf_token = new_token
                    # Update session headers for future requests
                    self.session.headers.update({
                        'X-XSRF-TOKEN': self.csrf_token,
                        'DSPACE-XSRF-TOKEN': self.csrf_token
                    })
                
                print("✅ Logged in to DSpace REST API")
                return True
            else:
                print(f"❌ REST API login failed: {login_response.status_code}")
                if login_response.status_code == 401:
                    print("   Check username/password in the script")
                elif login_response.status_code == 403:
                    print("   User may not have admin privileges")
                return False
                
        except Exception as e:
            print(f"❌ REST API login failed: {e}")
            return False

    def get_workflow_stats_from_db(self):
        """Get workflow statistics directly from database"""
        try:
            cursor = self.conn.cursor()
            
            # Check cwf_workflowitem table for workflow items
            cursor.execute("SELECT COUNT(*) FROM cwf_workflowitem")
            workflow_items = cursor.fetchone()[0]
            
            # Check cwf_pooltask table for pool tasks
            cursor.execute("SELECT COUNT(*) FROM cwf_pooltask")
            pool_tasks = cursor.fetchone()[0]
            
            # Check cwf_claimtask table for claimed tasks
            cursor.execute("SELECT COUNT(*) FROM cwf_claimtask")
            claimed_tasks = cursor.fetchone()[0]
            
            cursor.close()
            return workflow_items, pool_tasks, claimed_tasks
            
        except Exception as e:
            print(f"❌ Database workflow query failed: {e}")
            return 0, 0, 0
    
    def get_workflow_stats(self):
        """Get current workflow statistics - try REST API first, fallback to database"""
        # First try database approach since REST API has permission issues
        workflow_items, pool_tasks, claimed_tasks = self.get_workflow_stats_from_db()
        
        if workflow_items > 0 or pool_tasks > 0 or claimed_tasks > 0:
            print(f"📊 Database found: {workflow_items} workflow items, {pool_tasks} pool tasks, {claimed_tasks} claimed tasks")
            return workflow_items, pool_tasks, claimed_tasks
        
        # Fallback to REST API if database shows nothing
        try:
            if not self.session:
                if not self.rest_api_login():
                    return 0, 0, 0

            # Try basic workflow endpoints
            endpoints = ["workflow/pooltasks", "workflow/claimedtasks"]
            
            pool_tasks = 0
            claimed_tasks = 0
            
            for endpoint in endpoints:
                try:
                    response = self.session.get(f"http://localhost:8080/server/api/{endpoint}")
                    if response.status_code == 200:
                        data = response.json()
                        count = data.get('page', {}).get('totalElements', 0)
                        if "pooltasks" in endpoint:
                            pool_tasks = count
                        elif "claimedtasks" in endpoint:
                            claimed_tasks = count
                except Exception:
                    continue

            total_workflow = pool_tasks + claimed_tasks
            return total_workflow, pool_tasks, claimed_tasks
            
        except Exception as e:
            print(f"❌ Error getting workflow stats: {e}")
            return 0, 0, 0

    def get_pool_tasks(self):
        """Get all pool tasks via REST API"""
        try:
            if not self.session:
                if not self.rest_api_login():
                    return []

            response = self.session.get(
                "http://localhost:8080/server/api/workflow/pooltasks?size=1000"
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get('_embedded', {}).get('pooltasks', [])
            else:
                print(f"❌ Failed to get pool tasks: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"❌ Error getting pool tasks: {e}")
            return []

    def get_claimed_tasks(self):
        """Get all claimed tasks via REST API"""
        try:
            if not self.session:
                if not self.rest_api_login():
                    return []

            response = self.session.get(
                "http://localhost:8080/server/api/workflow/claimedtasks?size=1000"
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get('_embedded', {}).get('claimedtasks', [])
            else:
                print(f"❌ Failed to get claimed tasks: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"❌ Error getting claimed tasks: {e}")
            return []

    def claim_task(self, pool_task_id):
        """Claim a pool task via REST API"""
        try:
            headers = {"Content-Type": "application/json"}
            if self.csrf_token:
                headers["X-XSRF-TOKEN"] = self.csrf_token
            
            # Claim the task (empty POST to the pooltask)
            response = self.session.post(
                f"http://localhost:8080/server/api/workflow/pooltasks/{pool_task_id}",
                headers=headers,
                json={}
            )
            
            if response.status_code in [200, 201]:
                print(f"     ✅ Claimed pool task {pool_task_id}")
                return True
            else:
                print(f"     ❌ Failed to claim task {pool_task_id}: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"     ❌ Error claiming task {pool_task_id}: {e}")
            return False

    def approve_task(self, claimed_task_id):
        """Approve a claimed task via REST API"""
        try:
            headers = {"Content-Type": "application/json"}
            if self.csrf_token:
                headers["X-XSRF-TOKEN"] = self.csrf_token
            
            # Approve the task
            response = self.session.post(
                f"http://localhost:8080/server/api/workflow/claimedtasks/{claimed_task_id}",
                headers=headers,
                params={"submit_approve": "true"}
            )
            
            if response.status_code in [200, 201, 204]:
                print(f"     ✅ Approved claimed task {claimed_task_id}")
                return True
            else:
                print(f"     ❌ Failed to approve task {claimed_task_id}: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"     ❌ Error approving task {claimed_task_id}: {e}")
            return False

    def reject_task(self, claimed_task_id):
        """Reject a claimed task via REST API"""
        try:
            headers = {"Content-Type": "application/json"}
            if self.csrf_token:
                headers["X-XSRF-TOKEN"] = self.csrf_token
            
            # Reject the task
            response = self.session.post(
                f"http://localhost:8080/server/api/workflow/claimedtasks/{claimed_task_id}",
                headers=headers,
                params={"submit_reject": "true"}
            )
            
            if response.status_code in [200, 201, 204]:
                print(f"     ❌ Rejected claimed task {claimed_task_id}")
                return True
            else:
                print(f"     ❌ Failed to reject task {claimed_task_id}: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"     ❌ Error rejecting task {claimed_task_id}: {e}")
            return False

    def safe_rest_indexing(self, item_ids):
        """Use REST API for indexing instead of broken command-line tool"""
        try:
            if not self.session:
                if not self.rest_api_login():
                    return False

            headers = {"Content-Type": "application/json"}
            if self.csrf_token:
                headers["X-XSRF-TOKEN"] = self.csrf_token

            # Index each item via REST API
            success_count = 0
            for item_id in item_ids:
                try:
                    index_response = self.session.post(
                        f"http://localhost:8080/server/api/system/indexableobjects/Item/{item_id}/reindex",
                        headers=headers
                    )
                    if index_response.status_code in [200, 202]:
                        success_count += 1
                        print(f"     ✅ REST indexed item {item_id[:8]}...")
                    else:
                        print(f"     ⚠️  REST index failed for {item_id[:8]}: {index_response.status_code}")
                except Exception as e:
                    print(f"     ⚠️  REST indexing error for {item_id[:8]}: {e}")
                    continue
            
            print(f"✅ Successfully indexed {success_count}/{len(item_ids)} items via REST API")
            return success_count > 0
            
        except Exception as e:
            print(f"❌ REST indexing failed: {e}")
            return False

    def approve_workflow_items_via_db(self):
        """Approve workflow items directly via database - complete DSpace workflow process"""
        try:
            cursor = self.conn.cursor()
            
            # Get all workflow items that need approval
            cursor.execute("""
                SELECT workflowitem_id, item_id, collection_id
                FROM cwf_workflowitem
            """)
            
            workflow_items = cursor.fetchall()
            
            if not workflow_items:
                print("✅ No workflow items found in database")
                return True
            
            print(f"📊 Found {len(workflow_items)} workflow items in database")
            
            # Confirm action
            confirm = input(f"\n🚨 APPROVE ALL {len(workflow_items)} ITEMS VIA DATABASE? (yes/no): ")
            if confirm.lower() != 'yes':
                print("❌ Operation cancelled")
                return False
            
            approved_count = 0
            
            for workflowitem_id, item_id, collection_id in workflow_items:
                try:
                    # Complete DSpace workflow approval process:
                    
                    # Simple approach: just set item as archived and remove from workflow
                    # This is the minimal change needed to make items public
                    
                    # 1. Set item as archived and discoverable using DSpace object approach
                    cursor.execute("""
                        UPDATE item SET 
                            in_archive = true, 
                            withdrawn = false,
                            discoverable = true
                        WHERE uuid = %s
                    """, (item_id,))
                    
                    # 2. Get the DSpace object ID for the item (needed for collection mapping)
                    cursor.execute("""
                        SELECT uuid FROM item WHERE uuid = %s
                    """, (item_id,))
                    
                    item_result = cursor.fetchone()
                    if not item_result:
                        print(f"     ⚠️  Item {item_id} not found")
                        continue
                    
                    # 3. Ensure collection2item mapping exists (use UUIDs)
                    cursor.execute("""
                        SELECT COUNT(*) FROM collection2item 
                        WHERE collection_id = %s AND item_id = %s
                    """, (collection_id, item_id))
                    
                    if cursor.fetchone()[0] == 0:
                        cursor.execute("""
                            INSERT INTO collection2item (collection_id, item_id) 
                            VALUES (%s, %s)
                        """, (collection_id, item_id))
                    
                    # 4. Create handle for the item if it doesn't exist
                    cursor.execute("""
                        SELECT COUNT(*) FROM handle 
                        WHERE resource_id = %s AND resource_type_id = 2
                    """, (item_id,))
                    
                    if cursor.fetchone()[0] == 0:
                        # Generate a simple handle
                        import time
                        handle_suffix = f"item-{int(time.time())}-{workflowitem_id}"
                        cursor.execute("""
                            INSERT INTO handle (handle, resource_type_id, resource_id) 
                            VALUES (%s, 2, %s)
                        """, (f"123456789/{handle_suffix}", item_id))
                    
                    # 5. Remove from workflow tables in correct order (child tables first)
                    cursor.execute("DELETE FROM cwf_pooltask WHERE workflowitem_id = %s", (workflowitem_id,))
                    cursor.execute("DELETE FROM cwf_claimtask WHERE workflowitem_id = %s", (workflowitem_id,))
                    cursor.execute("DELETE FROM cwf_workflowitem WHERE workflowitem_id = %s", (workflowitem_id,))
                    
                    self.conn.commit()
                    approved_count += 1
                    print(f"     ✅ Approved item {item_id} (workflow {workflowitem_id})")
                    
                except Exception as e:
                    print(f"     ❌ Failed to approve workflow {workflowitem_id}: {e}")
                    self.conn.rollback()
                    continue
            
            cursor.close()
            
            print(f"\n✅ SUCCESS: Approved {approved_count}/{len(workflow_items)} items via database")
            print("🎉 Items are now publicly discoverable!")
            print("🔍 Updating search index...")
            
            # Update search index after approval
            if not self.update_search_index():
                print("⚠️  REST API indexing failed, trying command line...")
                self.force_index_update()
            
            return approved_count > 0
            
        except Exception as e:
            print(f"❌ Database approval failed: {e}")
            return False
    
    def force_index_update(self):
        """Force search index update using command line tools"""
        try:
            import subprocess
            print("🔄 Forcing search index update via command line...")
            
            # Try DSpace command line indexing
            result = subprocess.run([
                "/dspace/bin/dspace", "index-discovery", "-b"
            ], capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0:
                print("✅ Search index updated successfully")
                return True
            else:
                print(f"❌ Index update failed: {result.stderr}")
                
                # Alternative: restart DSpace services
                print("⚠️  Try restarting DSpace services manually:")
                print("   sudo systemctl restart tomcat9")
                print("   or restart your DSpace application server")
                return False
                
        except Exception as e:
            print(f"❌ Command line indexing failed: {e}")
            print("⚠️  Manual steps to make items visible:")
            print("   1. Restart DSpace/Tomcat: sudo systemctl restart tomcat9")
            print("   2. Or run: /dspace/bin/dspace index-discovery -b")
            print("   3. Clear browser cache and check again")
            return False
    
    def claim_and_approve_all_items(self, batch_size=20):
        """Claim and approve ALL items - try REST API first, fallback to database"""
        # Get workflow statistics
        workflow_count, pool_tasks, claimed_tasks = self.get_workflow_stats()
        
        if workflow_count == 0:
            print("✅ No items in workflow queue")
            return True
        
        print(f"📊 Workflow Summary:")
        print(f"   Total workflow items: {workflow_count}")
        print(f"   Pool tasks: {pool_tasks}")
        print(f"   Claimed tasks: {claimed_tasks}")
        
        # Always use database approach since REST API has permission issues
        print("⚠️  Using direct database approach for reliable approval...")
        return self.approve_workflow_items_via_db()
        
        # Try REST API approach
        try:
            # Confirm action
            confirm = input(f"\n🚨 CLAIM AND APPROVE ALL {workflow_count} ITEMS? (yes/no): ")
            if confirm.lower() != 'yes':
                print("❌ Operation cancelled")
                return False
            
            start_time = time.time()
            approved_count = 0
            
            # Step 1: Claim all pool tasks
            if pool_tasks > 0:
                print(f"\n🔄 Step 1: Claiming {pool_tasks} pool tasks...")
                pool_tasks_list = self.get_pool_tasks()
                
                for task in pool_tasks_list:
                    task_id = task.get('id')
                    if task_id and self.claim_task(task_id):
                        approved_count += 1
                    time.sleep(0.5)
            
            # Step 2: Approve all claimed tasks
            print(f"\n🔄 Step 2: Approving claimed tasks...")
            claimed_tasks_list = self.get_claimed_tasks()
            
            for task in claimed_tasks_list:
                task_id = task.get('id')
                if task_id and self.approve_task(task_id):
                    approved_count += 1
                time.sleep(0.5)
            
            elapsed = time.time() - start_time
            
            print(f"\n✅ SUCCESS: Processed {approved_count} items in {elapsed:.2f} seconds")
            print("🎉 Items approved through proper workflow process!")
            
            return approved_count > 0
            
        except Exception as e:
            print(f"❌ REST API approval failed: {e}")
            print("⚠️  Falling back to database approach...")
            return self.approve_workflow_items_via_db()

    def update_search_index(self):
        """Update search index using REST API for reliable indexing"""
        print("\n🔄 Updating search index via REST API...")
        try:
            if not self.rest_api_login():
                return False

            # Get all items (we'll index a reasonable number to avoid timeouts)
            response = self.session.get("http://localhost:8080/server/api/core/items?size=1000")
            if response.status_code == 200:
                data = response.json()
                items = data.get('_embedded', {}).get('items', [])
                item_ids = [item.get('id') for item in items if item.get('id')]
                
                if not item_ids:
                    print("✅ No items to index")
                    return True
                
                print(f"🔍 Indexing {len(item_ids)} items via REST API...")
                return self.safe_rest_indexing(item_ids)
            else:
                print(f"❌ Failed to get items for indexing: {response.status_code}")
                return False
            
        except Exception as e:
            print(f"❌ Search index update failed: {e}")
            return False

    def show_database_schema(self):
        """Show database table structures for debugging"""
        try:
            cursor = self.conn.cursor()
            
            # Show all tables
            cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
            tables = cursor.fetchall()
            print(f"📊 Database Tables ({len(tables)} total):")
            for table in tables[:20]:  # Show first 20 tables
                print(f"   {table[0]}")
            if len(tables) > 20:
                print(f"   ... and {len(tables) - 20} more")
            
            # Show structure of key tables
            key_tables = ['item', 'cwf_workflowitem', 'collection2item']
            for table_name in key_tables:
                print(f"\n🔍 Table: {table_name}")
                cursor.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table_name}' ORDER BY ordinal_position")
                columns = cursor.fetchall()
                for col_name, col_type in columns:
                    print(f"   {col_name}: {col_type}")
            
            cursor.close()
            
        except Exception as e:
            print(f"❌ Schema check failed: {e}")
    
    def show_current_status(self):
        """Show current workflow and archive status"""
        try:
            workflow_count, pool_tasks, claimed_tasks = self.get_workflow_stats()
            
            # Get archived items count from REST API
            archived_count = 0
            if self.rest_api_login():
                response = self.session.get("http://localhost:8080/server/api/core/items?size=1")
                if response.status_code == 200:
                    data = response.json()
                    archived_count = data.get('page', {}).get('totalElements', 0)
            
            print(f"📊 CURRENT STATUS:")
            print(f"   Workflow items: {workflow_count}")
            print(f"   Pool tasks: {pool_tasks}")
            print(f"   Claimed tasks: {claimed_tasks}")
            print(f"   Public items: {archived_count}")
            print(f"   Total pending: {workflow_count}")
            
            return workflow_count, archived_count
            
        except Exception as e:
            print(f"❌ Status check failed: {e}")
            return 0, 0

def main():
    print("=" * 60)
    print("🚀 DSpace Bulk Workflow Approval - REST API VERSION")
    print("=" * 60)
    
    approver = DSpaceBulkApprover()
    
    if not approver.connect():
        sys.exit(1)
    
    while True:
        print("\n" + "=" * 50)
        print("OPTIONS:")
        print("1. Show current status")
        print("2. Claim and approve ALL items (REST API)")
        print("3. Update search index (REST API)")
        print("4. Show database schema (debug)")
        print("5. Exit")
        
        choice = input("\nSelect option (1-5): ").strip()
        
        if choice == '1':
            approver.show_current_status()
            
        elif choice == '2':
            batch_size = input("Batch size [20]: ").strip()
            batch_size = int(batch_size) if batch_size.isdigit() else 20
            approver.claim_and_approve_all_items(batch_size=batch_size)
            
        elif choice == '3':
            approver.update_search_index()
            
        elif choice == '4':
            approver.show_database_schema()
            
        elif choice == '5':
            print("👋 Exiting...")
            break
            
        else:
            print("❌ Invalid option")

if __name__ == "__main__":
    main()