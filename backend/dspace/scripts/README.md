# DSpace to Koha Automatic Metadata Harvester

A robust, production-ready system for automatically harvesting metadata from DSpace repositories and importing them into Koha library management system with comprehensive MARC field mapping.

## Features

✨ **Automatic Metadata Mapping**
- Comprehensive Dublin Core to MARC21 conversion
- Smart field validation and cleaning
- Proper author name formatting (Last, First)
- Automatic material type detection
- Subtitle parsing and proper MARC subfield assignment

🔄 **Incremental Harvesting**
- OAI-PMH resumption token support
- Tracks last harvest timestamp
- Handles large repositories efficiently
- Duplicate prevention

🛡️ **Error Handling & Recovery**
- Retry logic for network failures
- Individual record error isolation
- Comprehensive logging system
- Error record tracking for analysis

📊 **Monitoring & Reporting**
- Real-time harvest monitoring
- Detailed statistics and reports
- JSON output for integration
- Status checking for monitoring systems

⚙️ **Production Ready**
- Configurable field mappings
- Cron job automation
- Timeout handling
- Memory efficient processing

## Quick Start

1. **Run the setup script:**
   ```bash
   ./setup_harvest.sh
   ```

2. **Start harvesting:**
   ```bash
   ./dspace_koha_cron.py
   ```

3. **Monitor progress:**
   ```bash
   ./harvest_monitor.py
   ```

## Installation

### Prerequisites

- Python 3.6+
- Koha library system
- DSpace repository with OAI-PMH endpoint

### Dependencies

```bash
pip3 install requests lxml pymarc
```

### Manual Setup

1. Clone or download the scripts
2. Edit configuration in `dspace_koha_cron.py`:
   - Set `DSpace_BASE_OAI` to your DSpace OAI endpoint
   - Configure file paths as needed
3. Make scripts executable:
   ```bash
   chmod +x dspace_koha_cron.py harvest_monitor.py
   ```

## Configuration

### Main Configuration (dspace_koha_cron.py)

```python
DSpace_BASE_OAI = "http://localhost:8080/server/oai/request"
METADATA_PREFIX = "oai_dc"
MARC_OUTPUT_FILE = "/home/biruk/dspace_to_koha.xml"
LOG_FILE = "/home/biruk/dspace_to_koha.log"
BRANCH_CODE = "MAIN"
```

### Field Mapping Configuration (mapping_config.json)

Customize Dublin Core to MARC field mappings:

```json
{
  "field_mappings": {
    "title": {
      "marc_field": "245",
      "indicators": ["1", "0"],
      "subfields": {
        "main": "a",
        "subtitle": "b"
      }
    }
  }
}
```

## MARC Field Mappings

| Dublin Core | MARC Field | Description |
|-------------|------------|-------------|
| dc:title | 245$a,$b | Title and subtitle |
| dc:creator | 100$a, 700$a | Main and additional authors |
| dc:subject | 650$a | Subject headings |
| dc:description | 520$a | Abstract/summary |
| dc:publisher | 260$b | Publisher |
| dc:date | 260$c | Publication date |
| dc:identifier | 856$u | Electronic location |
| dc:language | 041$a | Language code |
| dc:source | 786$n | Source information |
| dc:rights | 540$a | Rights/copyright |

## Usage

### Manual Harvest
```bash
./dspace_koha_cron.py
```

### Automated Harvest (Cron)
```bash
# Every 6 hours
0 */6 * * * /path/to/dspace_koha_cron.py >> /var/log/harvest.log 2>&1
```

### Monitoring
```bash
# Generate report
./harvest_monitor.py

# JSON output
./harvest_monitor.py --json

# Status check (for monitoring systems)
./harvest_monitor.py --check-status
```

## File Structure

```
dspace_uploader/
├── dspace_koha_cron.py      # Main harvest script
├── harvest_monitor.py       # Monitoring and reporting
├── mapping_config.json      # Field mapping configuration
├── setup_harvest.sh         # Automated setup script
├── README.md               # This file
├── /home/biruk/dspace_to_koha.log        # Harvest log
├── /home/biruk/last_harvest.txt          # Last harvest timestamp
└── /home/biruk/error_records.json        # Error record tracking
```

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Check DSpace OAI endpoint URL
   - Verify network connectivity
   - Check firewall settings

2. **Import Errors**
   - Ensure Koha import tools are in PATH
   - Check Koha database permissions
   - Verify MARC record format

3. **Memory Issues**
   - Large repositories may require processing in smaller batches
   - Monitor system resources during harvest

### Logs and Debugging

- Check `/home/biruk/dspace_to_koha.log` for detailed logs
- Review `/home/biruk/error_records.json` for problematic records
- Use `harvest_monitor.py` for status overview

### Error Recovery

The system automatically:
- Retries failed network requests
- Skips invalid records without stopping
- Tracks resumption tokens for interrupted harvests
- Logs all errors for analysis

## Advanced Configuration

### Custom Field Mappings

Edit `mapping_config.json` to customize field mappings:

```json
{
  "field_mappings": {
    "custom_field": {
      "marc_field": "999",
      "indicators": [" ", " "],
      "subfield": "a"
    }
  }
}
```

### Koha Integration

The system supports multiple Koha import methods:
- `koha-importbiblio.pl` (preferred)
- `bulkmarcimport.pl` (fallback)

### Performance Tuning

- Adjust `MAX_RETRIES` and `TIMEOUT` values
- Modify batch sizes for large repositories
- Configure appropriate cron intervals

## Support

For issues and questions:
1. Check the logs first
2. Review this documentation
3. Test with a small dataset
4. Verify all dependencies are installed

## License

This project is open source. Use and modify as needed for your institution.