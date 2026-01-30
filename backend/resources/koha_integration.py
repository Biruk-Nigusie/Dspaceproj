import requests
import json
import re
import time
from django.conf import settings

class KohaAPI:
    def __init__(self):
        self.base_url = settings.KOHA_API_URL
        self.username = "koha"  # Default Koha user
        self.password = "koha"
        self.token = None
    
    def authenticate(self):
        """Authenticate with Koha API"""
        try:
            auth_url = f"{self.base_url}/api/v1/auth/session"
            auth_data = {
                "username": self.username,
                "password": self.password
            }
            response = requests.post(auth_url, json=auth_data)
            if response.status_code == 201:
                self.token = response.json().get('session_id')
                return True
        except:
            pass
        return False
    
    def create_biblio(self, title, authors, description, year, resource_type, dspace_url):
        """Create bibliographic record in Koha"""
        try:
            url = f"{self.base_url}/api/v1/biblios"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.token}'
            } if self.token else {'Content-Type': 'application/json'}
            
            # Create MARCXML record
            marcxml = self.create_marcxml(title, authors, description, year, resource_type, dspace_url)
            
            data = {
                "marcxml": marcxml,
                "framework": ""
            }
            
            response = requests.post(url, json=data, headers=headers)
            if response.status_code == 201:
                return response.json()
        except Exception as e:
            print(f"Koha create biblio error: {e}")
        return None
    
    def create_marcxml(self, title, authors, description, year, resource_type, dspace_url):
        """Create MARCXML record"""
        marcxml = f'''<?xml version="1.0" encoding="UTF-8"?>
<record xmlns="http://www.loc.gov/MARC21/slim">
    <leader>00000nam a2200000 a 4500</leader>
    <datafield tag="245" ind1="1" ind2="0">
        <subfield code="a">{title}</subfield>
    </datafield>'''
        
        if authors:
            marcxml += f'''
    <datafield tag="100" ind1="1" ind2=" ">
        <subfield code="a">{authors}</subfield>
    </datafield>'''
        
        if year:
            marcxml += f'''
    <datafield tag="260" ind1=" " ind2=" ">
        <subfield code="c">{year}</subfield>
    </datafield>'''
        
        if description:
            marcxml += f'''
    <datafield tag="520" ind1=" " ind2=" ">
        <subfield code="a">{description}</subfield>
    </datafield>'''
        
        if dspace_url:
            marcxml += f'''
    <datafield tag="856" ind1="4" ind2="0">
        <subfield code="u">{dspace_url}</subfield>
        <subfield code="z">Access online resource</subfield>
    </datafield>'''
        
        marcxml += '''
</record>'''
        
        return marcxml
    
    def add_item(self, biblio_id, item_data):
        """Add item to bibliographic record"""
        # Skip REST API attempt, go directly to CGI fallback
        try:
            sess = requests.Session()

            # 1) GET mainpage to get CSRF token for login
            login_page = sess.get(f"{self.base_url}/cgi-bin/koha/mainpage.pl")
            login_csrf = None
            m = re.search(r'name="csrf_token" value="([^"]+)"', login_page.text)
            if m:
                login_csrf = m.group(1)

            login_data = {
                'csrf_token': login_csrf or '',
                'login_userid': self.username,
                'password': self.password,
                'op': 'cud-login',
                'koha_login_context': 'intranet'
            }
            headers = {'Referer': f"{self.base_url}/cgi-bin/koha/mainpage.pl"}
            login_resp = sess.post(f"{self.base_url}/cgi-bin/koha/mainpage.pl", data=login_data, headers=headers)
            print(f"Koha CGI login status: {login_resp.status_code}")

            # 2) GET additem form to obtain CSRF token and form structure
            additem_url = f"{self.base_url}/cgi-bin/koha/cataloguing/additem.pl?biblionumber={biblio_id}"
            addpage = sess.get(additem_url)
            m2 = re.search(r'name="csrf_token" value="([^"]+)"', addpage.text)
            csrf = m2.group(1) if m2 else None

            # Prepare form payload using the same input names the additem page uses (items.*)
            form = {
                'csrf_token': csrf or '',
                'biblionumber': str(biblio_id),
            }

            # Preferred field names are the items.* inputs used by the additem form
            items_map = {
                'barcode': 'items.barcode',
                'itemcallnumber': 'items.itemcallnumber',
                'date_accessioned': 'items.dateaccessioned',
                'copynumber': 'items.copynumber',
                'uri': 'items.uri',
                'materials_specified': 'items.materials',
                'ccode': 'items.ccode',
                'homebranch': 'items.homebranch',
                'holdingbranch': 'items.holdingbranch',
                'itype': 'items.itype',
                'location': 'items.location',
                'itemnotes': 'items.itemnotes',
                'itemnotes_nonpublic': 'items.itemnotes_nonpublic',
            }

            for src, dest in items_map.items():
                if src in item_data and item_data.get(src) is not None:
                    form[dest] = item_data.get(src)

            # ensure minimal required fields
            if 'items.barcode' not in form:
                form['items.barcode'] = f"DIGITAL-{int(time.time())}"
            if 'items.itype' not in form:
                # use Koha internal code (common: BK for Books)
                form['items.itype'] = item_data.get('itype', 'BK')
            if 'items.homebranch' not in form:
                # use branch code; default to RPL (Riverside) if unknown
                form['items.homebranch'] = item_data.get('homebranch', 'RPL')
            if 'items.holdingbranch' not in form:
                form['items.holdingbranch'] = item_data.get('holdingbranch', 'TPL')

            # include submit flag expected by the form
            form['add_submit'] = 'Add item'

            # POST the additem form
            post_headers = {'Referer': additem_url}
            post_resp = sess.post(additem_url, data=form, headers=post_headers)
            print(f"Koha additem CGI status: {post_resp.status_code}")

            # Heuristic: look for the Holdings marker (e.g. 'Holdings (') which indicates an item row exists
            if post_resp.status_code in (200, 302) and ('Holdings' in post_resp.text or 'Items' in post_resp.text or 'Added' in post_resp.text.lower()):
                return {'status': 'ok', 'method': 'cgi', 'response': post_resp.text[:400]}
            else:
                print(f"Koha CGI additem failed, response len={len(post_resp.text)}")
        except Exception as e:
            print(f"Koha CGI fallback error: {e}")

        return None