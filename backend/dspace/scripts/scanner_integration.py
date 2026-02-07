#!/usr/bin/env python3
"""
DSpace Scanner Integration - Monitors folder and uploads scanned PDFs
"""

import os
import time
import shutil
import logging
import hashlib
import xml.etree.ElementTree as ET
import xml.dom.minidom as minidom
from pathlib import Path
from queue import Queue
from threading import Thread, Lock
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from datetime import datetime
from dspace_client import create_authenticated_client
from config import COLLECTION_UUID

# Configuration from environment
SCANNER_HOT_FOLDER = os.getenv('SCANNER_HOT_FOLDER', '/home/biruk/scanner_hotfolder')
ARCHIVE_BASE = os.getenv('ARCHIVE_BASE', '/home/biruk/scanner_archive')
ERROR_FOLDER = os.getenv('ERROR_FOLDER', '/home/biruk/scanner_errors')
LOG_FILE = os.getenv('SCANNER_LOG_FILE', '/home/biruk/scanner.log')

# Processing settings
MAX_RETRIES = 3
RETRY_DELAY = 5
MIN_FILE_AGE = 5
SCAN_CHECK_INTERVAL = 1

# Logging setup
def setup_logging():
    log_format = '%(asctime)s - %(levelname)s - %(message)s'
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        handlers=[
            logging.FileHandler(LOG_FILE),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

logger = setup_logging()

# XML Metadata Generator
class MetadataGenerator:
    @staticmethod
    def generate_dublin_core(pdf_path, item_info):
        root = ET.Element("dublin_core", schema="dc")
        filename = os.path.basename(pdf_path)
        scan_date = datetime.fromtimestamp(os.stat(pdf_path).st_mtime)
        
        MetadataGenerator._add_element(root, "title", 
            item_info.get('title', f"Scanned Document: {filename}"))
        MetadataGenerator._add_element(root, "creator", 
            item_info.get('creator', "Scanner"))
        MetadataGenerator._add_element(root, "date", 
            item_info.get('date', scan_date.strftime("%Y-%m-%d")))
        MetadataGenerator._add_element(root, "description", 
            item_info.get('description', f"Scanned on {scan_date}"))
        MetadataGenerator._add_element(root, "type", 
            item_info.get('type', "Text"))
        MetadataGenerator._add_element(root, "format", "application/pdf")
        
        xml_str = ET.tostring(root, encoding='unicode')
        dom = minidom.parseString(xml_str)
        return dom.toprettyxml(indent="  ")
    
    @staticmethod
    def _add_element(parent, element_name, value):
        if value:
            elem = ET.SubElement(parent, "dcvalue", element=element_name)
            elem.text = str(value)
    
    @staticmethod
    def save_metadata_xml(pdf_path, xml_content):
        xml_path = pdf_path.replace('.pdf', '_dublin_core.xml')
        with open(xml_path, 'w', encoding='utf-8') as f:
            f.write(xml_content)
        return xml_path

# File Processor
class FileProcessor:
    def __init__(self):
        self.file_queue = Queue()
        self.processed_files = set()
        self.processing_lock = Lock()
        
    def process_file(self, file_path):
        filename = os.path.basename(file_path)
        file_hash = self._get_file_hash(file_path)
        
        with self.processing_lock:
            if file_hash in self.processed_files:
                logger.info(f"Already processed: {filename}")
                return True
        
        logger.info(f"Processing: {filename}")
        
        for attempt in range(MAX_RETRIES):
            try:
                c = create_authenticated_client()
                if not c:
                    logger.error("Auth failed")
                    continue
                
                # Parse metadata from XML if exists
                metadata_patch = self._parse_metadata(file_path)
                
                # Create workspace
                workspace_id = c.create_workspace_item(COLLECTION_UUID)
                if not workspace_id:
                    continue
                
                # Add metadata
                if metadata_patch and not c.add_workspace_metadata(workspace_id, metadata_patch):
                    continue
                
                # Upload file
                if not c.upload_file_to_workspace(workspace_id, file_path):
                    continue
                
                # Accept license
                if not c.accept_workspace_license(workspace_id):
                    continue
                
                # Submit to workflow
                if not c.submit_workspace_item(workspace_id):
                    continue
                
                # Archive
                self._archive_item(file_path, workspace_id)
                
                with self.processing_lock:
                    self.processed_files.add(file_hash)
                
                logger.info(f"Success: {filename} -> {workspace_id}")
                return True
                
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {str(e)}")
            
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (attempt + 1))
        
        self._move_to_error(file_path)
        logger.error(f"Failed: {filename}")
        return False
    
    def _parse_metadata(self, pdf_path):
        xml_path = pdf_path.replace('.pdf', '_dublin_core.xml')
        if not os.path.exists(xml_path):
            # Generate basic metadata
            item_info = {'title': os.path.basename(pdf_path)}
            xml_content = MetadataGenerator.generate_dublin_core(pdf_path, item_info)
            MetadataGenerator.save_metadata_xml(pdf_path, xml_content)
            xml_path = pdf_path.replace('.pdf', '_dublin_core.xml')
        
        try:
            tree = ET.parse(xml_path)
            patches = []
            for elem in tree.findall('.//dcvalue'):
                element = elem.get('element')
                value = elem.text.strip() if elem.text else ""
                
                if value:
                    if element == 'title':
                        patches.append({"op": "add", "path": "/sections/traditionalpageone/dc.title", 
                                      "value": [{"value": value}]})
                    elif element == 'date':
                        patches.append({"op": "add", "path": "/sections/traditionalpageone/dc.date.issued", 
                                      "value": [{"value": value}]})
                    elif element == 'type':
                        patches.append({"op": "add", "path": "/sections/traditionalpageone/dc.type", 
                                      "value": [{"value": value}]})
            return patches
        except Exception as e:
            logger.error(f"Parse metadata error: {e}")
            return []
    
    def _get_file_hash(self, file_path):
        try:
            file_stat = os.stat(file_path)
            hash_str = f"{os.path.basename(file_path)}-{file_stat.st_size}"
            return hashlib.md5(hash_str.encode()).hexdigest()
        except:
            return None
    
    def _archive_item(self, file_path, item_id):
        try:
            item_folder = f"item_{item_id}"
            archive_path = os.path.join(ARCHIVE_BASE, item_folder)
            os.makedirs(archive_path, exist_ok=True)
            
            shutil.move(file_path, os.path.join(archive_path, os.path.basename(file_path)))
            
            xml_source = file_path.replace('.pdf', '_dublin_core.xml')
            if os.path.exists(xml_source):
                shutil.move(xml_source, os.path.join(archive_path, f"item_{item_id}_dublin_core.xml"))
            
            logger.info(f"Archived to: {archive_path}")
            return True
        except Exception as e:
            logger.error(f"Archive error: {str(e)}")
            return False
    
    def _move_to_error(self, file_path):
        try:
            error_date = datetime.now().strftime("%Y%m%d")
            error_dir = os.path.join(ERROR_FOLDER, error_date)
            os.makedirs(error_dir, exist_ok=True)
            
            shutil.move(file_path, os.path.join(error_dir, os.path.basename(file_path)))
            
            xml_file = file_path.replace('.pdf', '_dublin_core.xml')
            if os.path.exists(xml_file):
                shutil.move(xml_file, os.path.join(error_dir, os.path.basename(xml_file)))
            
            logger.info(f"Moved to error: {error_dir}")
            return True
        except Exception as e:
            logger.error(f"Error move failed: {str(e)}")
            return False

# Folder Watcher
class ScannerFolderWatcher(FileSystemEventHandler):
    def __init__(self, processor):
        self.processor = processor
        self.recent_files = {}
        
    def on_created(self, event):
        if event.is_directory or not event.src_path.lower().endswith('.pdf'):
            return
        
        file_path = event.src_path
        current_time = time.time()
        
        if file_path in self.recent_files:
            if current_time - self.recent_files[file_path] < 10:
                return
        
        self.recent_files[file_path] = current_time
        time.sleep(MIN_FILE_AGE)
        
        try:
            if os.path.getsize(file_path) > 0:
                self.processor.file_queue.put(file_path)
                logger.info(f"Queued: {os.path.basename(file_path)}")
        except:
            pass
        
        self._clean_old_entries()
    
    def _clean_old_entries(self):
        current_time = time.time()
        old_keys = [k for k, v in self.recent_files.items() if current_time - v > 300]
        for key in old_keys:
            del self.recent_files[key]

# Worker Thread
def worker_thread(processor):
    while True:
        file_path = processor.file_queue.get()
        if file_path is None:
            break
        try:
            processor.process_file(file_path)
        except Exception as e:
            logger.error(f"Worker error: {str(e)}")
        finally:
            processor.file_queue.task_done()

# Main
def main():
    logger.info("=" * 60)
    logger.info("DSpace Scanner Integration")
    logger.info("=" * 60)
    
    for folder in [SCANNER_HOT_FOLDER, ARCHIVE_BASE, ERROR_FOLDER]:
        os.makedirs(folder, exist_ok=True)
        logger.info(f"Directory: {folder}")
    
    processor = FileProcessor()
    
    num_workers = 2
    workers = []
    for i in range(num_workers):
        worker = Thread(target=worker_thread, args=(processor,), daemon=True)
        worker.start()
        workers.append(worker)
        logger.info(f"Started worker {i+1}")
    
    event_handler = ScannerFolderWatcher(processor)
    observer = Observer()
    
    try:
        observer.schedule(event_handler, SCANNER_HOT_FOLDER, recursive=False)
        observer.start()
        
        logger.info(f"Watching folder: {SCANNER_HOT_FOLDER}")
        logger.info("Service running. Press Ctrl+C to stop.")
        
        last_status = time.time()
        while True:
            time.sleep(SCAN_CHECK_INTERVAL)
            if time.time() - last_status > 60:
                qsize = processor.file_queue.qsize()
                if qsize > 0:
                    logger.info(f"Queue: {qsize} files pending")
                last_status = time.time()
    
    except KeyboardInterrupt:
        logger.info("Shutdown requested...")
    except Exception as e:
        logger.error(f"Main loop error: {str(e)}")
    finally:
        observer.stop()
        observer.join()
        for _ in range(num_workers):
            processor.file_queue.put(None)
        for worker in workers:
            worker.join(timeout=10)
        logger.info("Service stopped")

if __name__ == "__main__":
    main()
