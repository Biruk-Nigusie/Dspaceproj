import re
import logging
from typing import Dict, Any, List
from dateutil.parser import parse

logger = logging.getLogger(__name__)

METADATA_FIELDS = [
    "crvs.head.husband",
    "crvs.head.wife",
    "crvs.identifier.houseType",
    "crvs.identifier.otherHouseType",
    "crvs.identifier.houseNumber",
    "crvs.identifier.houseFamilyKey",
    "crvs.family.member",
    "crvs.family.count",
    "crvs.date.registration",
    "crvs.document.status",
    "crvs.birth.childName",
    "crvs.birth.gender",
    "crvs.birth.dateOfBirth",
    "crvs.birth.placeOfBirth",
    "crvs.birth.childCitizenship",
    "crvs.birth.motherCitizenship",
    "crvs.birth.fatherCitizenship",
    "crvs.birth.motherName",
    "crvs.birth.fatherName",
    "crvs.birth.registeredDate",
    "crvs.birth.certificateIssuedDate",
    "crvs.marriage.husbandName",
    "crvs.marriage.wifeName",
    "crvs.marriage.date",
    "crvs.divorce.courtApprovalDate",
    "crvs.divorce.courtCaseNumber",
    "crvs.death.personName",
    "crvs.death.dateOfBirth",
    "crvs.death.dateOfDeath",
    "crvs.death.placeOfDeath",
    "crvs.death.citizenship",
    "crvs.death.motherName",
    "crvs.death.reason",
    "crvs.death.certificateIssuedDate",
    "crvs.death.gender",
]

MAX_DIMENSION = 4000


def filter_valid_dates(extracted_dates: list):
    valid_dates = []
    for val in extracted_dates:
        dt = parse_date_candidate(val)
        if dt and dt not in valid_dates:
            valid_dates.append(dt)
    return valid_dates


def parse_date_candidate(candidate: str):
    """Try to parse a candidate string into a valid date."""
    candidate = candidate.strip()
    try:
        # Fuzzy allows ignoring extra words like 'Year', 'Month', 'Day'
        dt = parse(candidate, fuzzy=True, dayfirst=True)
        return dt.date()  # Return only date part
    except Exception:
        return None


def extract_metadata(text: str) -> Dict[str, Any]:
    """
    Extract structured metadata from Raw OCR text via regex and keyword matching.
    """
    metadata: Dict[str, Any] = {}
    for field in METADATA_FIELDS:
        metadata[field] = extract_field_crvs(field, text)

    return metadata


def clean_extracted_value(val: str) -> str:
    """Clean whitespace and trailing punctuations"""
    if val:
        return val.strip(" \n\r\t.,;:")
    return val


def _concatenate_segment_values(
    extracted_data: Dict[str, List[str]],
) -> Dict[str, List[str]]:
    """Concatenate segmented values (e.g. name parts or date parts) into one value per language."""
    for lang, values in extracted_data.items():
        if not isinstance(values, list):
            continue

        non_empty_values = [
            value for value in values if isinstance(value, str) and value
        ]
        if len(non_empty_values) > 1:
            extracted_data[lang] = [" ".join(non_empty_values)]

    return extracted_data


def extract_field_crvs(field: str, text: str):
    """
    Regex based heuristic extraction for CRVS documents.
    Returns dictionary with lists of extracted values for each language.
    """
    patterns = {
        "crvs.head.husband": {
            "en": [
                r"(?i)husband[\'\s]*s?\s*name[\:\-\s]+([^\n]+)",
                r"(?i)full\s*name\s*of\s*husband[\:\-\s]+([^\n]+)",
            ],
            "am": [r"የባል\s*ስም[\:\-\s]+([^\n]+)", r"የባል\s*ሙሉ\s*ስም[\:\-\s]+([^\n]+)"],
        },
        "crvs.head.wife": {
            "en": [
                r"(?i)wife[\'\s]*s?\s*name[\:\-\s]+([^\n]+)",
                r"(?i)full\s*name\s*of\s*wife[\:\-\s]+([^\n]+)",
            ],
            "am": [r"የሚስት\s*ስም[\:\-\s]+([^\n]+)", r"የሚስት\s*ሙሉ\s*ስም[\:\-\s]+([^\n]+)"],
        },
        "crvs.identifier.houseNumber": {
            "en": [r"(?i)house\s*number[\:\-\s]+([^\n]+)"],
            "am": [r"የቤት\s*ቁጥር[\:\-\s]+([^\n]+)"],
        },
        "crvs.birth.childName": {
            "en": [
                r"(?i)full\s*name[\:\-\s]+([^\n]+)",
                r"(?i)child[\'\s]*s?\s*name[\:\-\s]+([^\n]+)",
                r"(?i)name\s*of\s*child[\:\-\s]+([^\n]+)",
                r"(?i)father[\'\s]*s?\s*name[\:\-\s]+([^\n]+)",
                r"(?i)grand\s*father[\'\s]*s?\s*name[\:\-\s]+([^\n]+)",
            ],
            "am": [
                r"የህፃኑ\s*ስም[\:\-\s]+([^\n]+)",
                r"የህፃኗ\s*ስም[\:\-\s]+([^\n]+)",
                r"የአባት\s*ስም[\:\-\s]+([^\n]+)",
                r"የአያት\s*ስም[\:\-\s]+([^\n]+)",
                r"ሙሉ\s*ስም[\:\-\s]+([^\n]+)",
            ],
        },
        "crvs.birth.dateOfBirth": {
            "en": [
                r"(?i)date\s*of\s*birth[\:\-\s]+([^\n]+)",
                r"(?i)date\s*of\s*birth\s*:\s*month[\:\-\s]+([^\n]+)",
                r"(?i)day[\:\-\s]+([^\n]+)",
                r"(?i)year[\:\-\s]+([^\n]+)",
            ],
            "am": [
                r"(?i)የተወለደበት\s*ቀን[\:\-\s]+([^\n]+)",
                r"የትውልድ\s*ቀን[\:\-\s]+([^\n]+)",
                r"የትውልድ\s*ወር[\:\-\s]+([^\n]+)",
                r"ቀን[\:\-\s]+([^\n]+)",
                r"ዓ.ም[\:\-\s]+([^\n]+)",
            ],
        },
        "crvs.birth.placeOfBirth": {
            "en": [
                r"(?i)place\s*of\s*birth[\:\-\s]+([^\n]+)",
            ],
            "am": [
                r"(?i)የትውልድ\s*ቦታ[\:\-\s]+([^\n]+)",
                r"(?i)የትውልድ\s*ስፍራ[\:\-\s]+([^\n]+)",
            ],
        },
        "crvs.birth.gender": {
            "en": [r"(?i)(?:sex|gender)[\:\-\s]+(Male|Female|M|F)"],
            "am": [r"(?i)(?:ፆታ|ጾታ)[\:\-\s]+(ወንድ|ሴት)"],
        },
        "crvs.birth.childCitizenship": {
            "en": [r"(?i)citizenship[\:\-\s]+([A-Za-z\s]+)"],
            "am": [r"ዜግነት[\:\-\s]+([^\n\r]+)"],
        },
        "crvs.birth.motherCitizenship": {
            "en": [r"(?i)mother(?:'s)?\s*citizenship\s*[:\.\-]?\s*([A-Za-z\s]+)"],
            "am": [r"(?:የ?እናት?\s*)?ዜግነት\s*[:\.\-]?\s*([^\n\r]+)"],
        },
        "crvs.birth.fatherCitizenship": {
            "en": [r"(?i)father(?:'s)?\s*citizenship\s*[:\.\-]?\s*([A-Za-z\s]+)"],
            "am": [r"(?:የ?አባት?\s*)?ዜግነት\s*[:\.\-]?\s*([^\n\r]+)"],
        },
        "crvs.birth.motherName": {
            "en": [
                r"(?i)mother[\'\s]*s?\s*full\s*name[\:\-\s]+([^\n]+)",
                r"(?i)mother[\'\s]\s*name[\:\-\s]+([^\n]+)",
            ],
            "am": [r"የእናት\s*ስም[\:\-\s]+([^\n]+)", r"የእናት\s*ሙሉ\s*ስም[\:\-\s]+([^\n]+)"],
        },
        "crvs.birth.fatherName": {
            "en": [
                r"(?i)father[\'\s]*s?\s*full\s*name[\:\-\s]+([^\n]+)",
                r"(?i)father[\'\s]\s*name[\:\-\s]+([^\n]+)",
            ],
            "am": [r"የአባት\s*ስም[\:\-\s]+([^\n]+)", r"የእናት\s*ሙሉ\s*ስም[\:\-\s]+([^\n]+)"],
        },
        "crvs.birth.registeredDate": {
            "en": [
                r"(?i)birth\s*registration\s*date\s*month[\:\-\s]+([^\n]+)",
                r"(?i)day[\:\-\s]+([^\n]+)",
                r"(?i)year[\:\-\s]+([^\n]+)",
            ],
            "am": [
                r"ልደት\s*የተመዘገበበት\s*ወር[\:\-\s]+([^\n]+)",
                r"ቀን[\:\-\s]+([^\n]+)",
                r"ዓ.ም[\:\-\s]+([^\n]+)",
            ],
        },
        "crvs.birth.certificateIssuedDate": {
            "en": [
                r"(?i)date\s*of\s*issue[\:\-\s]+([^\n]+)",
                r"(?i)certificate\s*issued\s*date[\:\-\s]+([^\n]+)",
                r"(?i)day[\:\-\s]+([^\n]+)",
                r"(?i)year[\:\-\s]+([^\n]+)",
            ],
            "am": [
                r"የተሰጠበት\s*ቀን[\:\-\s]+([^\n]+)",
                r"የምስክር\s*ወረቀት\s*የተሰጠበት\s*ወር[\:\-\s]+([^\n]+)",
                r"ቀን[\:\-\s]+([^\n]+)",
                r"ዓ.ም[\:\-\s]+([^\n]+)",
            ],
        },
        "crvs.marriage.husbandName": {
            "en": [
                r"(?i)husband[\'\s]*s?\s*name[\:\-\s]+([^\n]+)",
                r"(?i)name\s*of\s*husband[\:\-\s]+([^\n]+)",
                r"(?i)full\s*name\s*of\s*husband[\:\-\s]+([^\n]+)",
            ],
            "am": [
                r"የባል\s*ስም[\:\-\s]+([^\n]+)",
                r"የባል\s*ሙሉ\s*ስም[\:\-\s]+([^\n]+)",
                r"የሙሽራው\s*ስም[\:\-\s]+([^\n]+)",
            ],
        },
        "crvs.marriage.wifeName": {
            "en": [
                r"(?i)wife[\'\s]*s?\s*name[\:\-\s]+([^\n]+)",
                r"(?i)name\s*of\s*wife[\:\-\s]+([^\n]+)",
                r"(?i)full\s*name\s*of\s*wife[\:\-\s]+([^\n]+)",
            ],
            "am": [
                r"የሚስት\s*ስም[\:\-\s]+([^\n]+)",
                r"የሚስት\s*ሙሉ\s*ስም[\:\-\s]+([^\n]+)",
                r"የሙሽሪት\s*ስም[\:\-\s]+([^\n]+)",
            ],
        },
        "crvs.marriage.date": {
            "en": [
                r"(?i)date\s*of\s*marriage[\:\-\s]+([^\n]+)",
                r"(?i)marriage\s*date[\:\-\s]+([^\n]+)",
            ],
            "am": [r"የጋብቻ\s*ቀን[\:\-\s]+([^\n]+)", r"የተጋቡበት\s*ቀን[\:\-\s]+([^\n]+)"],
        },
        "crvs.divorce.courtApprovalDate": {
            "en": [
                r"(?i)on\s+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})\s+under\s+no",
                r"(?i)decision.*?on\s+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})",
            ],
            "am": [
                r"(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})\s+በቁጥር",
                r"በ\s*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})\s*ቀን",
            ],
        },
        "crvs.divorce.courtCaseNumber": {
            "en": [
                r"(?i)under\s+no\.?\s*([0-9]+)",
                r"(?i)case\s*(?:no|number)?\.?\s*[:\-]?\s*([0-9]+)",
            ],
            "am": [
                r"በቁጥር\s*([0-9]+)",
                r"የመዝገብ\s*ቁጥር\s*[:\-]?\s*([0-9]+)",
            ],
        },
        "crvs.death.personName": {
            "en": [
                r"(?i)deceased[\'\s]*s?\s*name[\:\-\s]+([^\n]+)",
                r"(?i)name\s*of\s*deceased[\:\-\s]+([^\n]+)",
            ],
            "am": [r"የሟች\s*ስም[\:\-\s]+([^\n]+)", r"የሟቹ\s*ስም[\:\-\s]+([^\n]+)"],
        },
        "crvs.death.citizenship": {
            "en": [r"(?i)citizenship[\:\-\s]+([A-Za-z\s]+)"],
            "am": [r"ዜግነት[\:\-\s]+([^\n\r]+)"],
        },
        "crvs.death.dateOfBirth": {
            "en": [
                r"(?i)date\s*of\s*birth[\:\-\s]+([^\n]+)",
                r"(?i)date\s*of\s*birth\s*:\s*month[\:\-\s]+([^\n]+)",
                r"(?i)day[\:\-\s]+([^\n]+)",
                r"(?i)year[\:\-\s]+([^\n]+)",
            ],
            "am": [
                r"(?i)የተወለደበት\s*ቀን[\:\-\s]+([^\n]+)",
                r"የትውልድ\s*ቀን[\:\-\s]+([^\n]+)",
                r"የትውልድ\s*ወር[\:\-\s]+([^\n]+)",
                r"ቀን[\:\-\s]+([^\n]+)",
                r"ዓ.ም[\:\-\s]+([^\n]+)",
            ],
        },
        "crvs.death.dateOfDeath": {
            "en": [
                r"(?i)date\s*of\s*death[\:\-\s]+([^\n]+)",
            ],
            "am": [
                r"(?i)የሞቱበት\s*ቀን[\:\-\s]+([^\n]+)",
            ],
        },
        "crvs.death.placeOfDeath": {
            "en": [
                r"(?i)place\s*of\s*death[\:\-\s]+([^\n]+)",
            ],
            "am": [
                r"(?i)የሞቱበት\s*ቦታ[\:\-\s]+([^\n]+)",
                r"(?i)የትውልድ\s*ስፍራ[\:\-\s]+([^\n]+)",
            ],
        },
        "crvs.death.motherName": {
            "en": [
                r"(?i)mother[\'\s]*s?\s*full\s*name[\:\-\s]+([^\n]+)",
                r"(?i)mother[\'\s]\s*name[\:\-\s]+([^\n]+)",
            ],
            "am": [r"የእናት\s*ስም[\:\-\s]+([^\n]+)", r"የእናት\s*ሙሉ\s*ስም[\:\-\s]+([^\n]+)"],
        },
        "crvs.death.fatherName": {
            "en": [
                r"(?i)father[\'\s]*s?\s*full\s*name[\:\-\s]+([^\n]+)",
                r"(?i)father[\'\s]\s*name[\:\-\s]+([^\n]+)",
            ],
            "am": [r"የአባት\s*ስም[\:\-\s]+([^\n]+)", r"የእናት\s*ሙሉ\s*ስም[\:\-\s]+([^\n]+)"],
        },
        "crvs.death.reason": {
            "en": [r"(?i)(?:reason|cause)\s*of\s*death[\:\-\s]+([^\n]+)"],
            "am": [r"የሞቱበት\s*ምክንያት[\:\-\s]+([^\n]+)"],
        },
        "crvs.death.certificateIssuedDate": {
            "en": [
                r"(?i)date\s*of\s*issue[\:\-\s]+([^\n]+)",
                r"(?i)certificate\s*issued\s*date[\:\-\s]+([^\n]+)",
                r"(?i)day[\:\-\s]+([^\n]+)",
                r"(?i)year[\:\-\s]+([^\n]+)",
            ],
            "am": [
                r"የተሰጠበት\s*ቀን[\:\-\s]+([^\n]+)",
                r"የምስክር\s*ወረቀት\s*የተሰጠበት\s*ወር[\:\-\s]+([^\n]+)",
                r"ቀን[\:\-\s]+([^\n]+)",
                r"ዓ.ም[\:\-\s]+([^\n]+)",
            ],
        },
        "crvs.death.gender": {
            "en": [r"(?i)(?:sex|gender)[\:\-\s]+(Male|Female|M|F)"],
            "am": [r"(?i)(?:ፆታ|ጾታ)[\:\-\s]+(ወንድ|ሴት)"],
        },
    }

    extracted_data: Dict[str, List[str]] = {"en": [], "am": []}

    if field in patterns:
        for lang, lang_patterns in patterns[field].items():
            for pattern in lang_patterns:
                try:
                    matches = re.finditer(pattern, text)
                    for match in matches:
                        if match.groups():
                            val = match.group(1)
                            if val:
                                cleaned = clean_extracted_value(val)
                                lang_list = extracted_data.get(lang)
                                if (
                                    cleaned
                                    and isinstance(lang_list, list)
                                    and cleaned not in lang_list
                                ):
                                    lang_list.append(cleaned)
                except Exception as e:
                    logger.debug(f"Regex error for {field} in lang {lang}: {e}")

    if field in {
        "crvs.birth.dateOfBirth",
        "crvs.birth.registeredDate",
        "crvs.birth.certificateIssuedDate",
        "crvs.marriage.date",
        "crvs.divorce.courtApprovalDate",
        "crvs.death.dateOfBirth",
        "crvs.death.dateOfDeath",
        "crvs.death.certificateIssuedDate",
    }:
        all_vals = _concatenate_segment_values(extracted_data)
        valid_dates = {
            lang: filter_valid_dates(vals) for lang, vals in all_vals.items()
        }
        return valid_dates

    if field in {
        "crvs.birth.childName",
    }:
        return _concatenate_segment_values(extracted_data)

    return extracted_data
