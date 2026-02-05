from pathlib import Path
import itertools
import random
import shutil
from datetime import datetime

BASE_DIR = Path("sample_data")

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

VITAL_EVENTS = ["BIR", "MAR", "DEA", "DIV"]

ETHIOPIAN_NAMES = [
    "Abel_Tadesse",
    "Mekdes_Kebede",
    "Samuel_Amanuel",
    "Hanna_Mulugeta",
    "Dawit_Girma",
    "Selam_Bekele",
    "Yonatan_Assefa",
    "Rahel_Teklu",
    "Kaleb_Fikru",
    "Liya_Habte",
    "Nahom_Daniel",
    "Betelhem_Tesfaye",
    "Biruk_Wondimu",
    "Eden_Shiferaw",
    "Yared_Mesfin",
    "Saron_Getachew",
]


# ---------- low-level PDF writer (stdlib only) ----------


def write_simple_pdf(path: Path, lines: list[str], title="Document"):
    text = "\\n".join(lines).replace("(", "\\(").replace(")", "\\)")
    content = f"""BT
/F1 12 Tf
72 720 Td
({text}) Tj
ET
"""

    objects = []

    objects.append("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj")
    objects.append("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj")
    objects.append(
        "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj"
    )
    objects.append(
        "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj"
    )
    objects.append(
        f"5 0 obj << /Length {len(content)} >> stream\n{content}\nendstream\nendobj"
    )

    xref = []
    pdf = "%PDF-1.4\n"

    for obj in objects:
        xref.append(len(pdf))
        pdf += obj + "\n"

    xref_pos = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    for pos in xref:
        pdf += f"{pos:010d} 00000 n \n"

    pdf += f"""trailer << /Size {len(objects) + 1} /Root 1 0 R >>
startxref
{xref_pos}
%%EOF
"""

    path.write_text(pdf, encoding="latin-1")


def rand_name():
    return random.choice(ETHIOPIAN_NAMES)


def rand_house():
    return f"H{random.randint(1000, 9999)}"


# ---------- destructive safety ----------
if BASE_DIR.exists() and any(BASE_DIR.iterdir()):
    print(f"'{BASE_DIR}' is not empty. Clearing...")
    shutil.rmtree(BASE_DIR)
    print("✔ Folder cleared.")

BASE_DIR.mkdir(parents=True, exist_ok=True)


# ---------- generation ----------
for sub_city, woreda_count in SUB_CITIES.items():
    sub_city_dir = BASE_DIR / sub_city
    sub_city_dir.mkdir(parents=True, exist_ok=True)

    for woreda_num in range(1, woreda_count + 1):
        woreda_dir = sub_city_dir / f"Woreda_{woreda_num:02d}"
        woreda_dir.mkdir()

        counter = itertools.count(1)

        for _ in range(random.randint(3, 6)):
            item_no = next(counter)
            item_dir = woreda_dir / f"H{item_no:06d}"
            item_dir.mkdir()

            house_no = rand_house()
            prefix = f"{sub_city}_{woreda_num:02d}_{house_no}"

            members = random.sample(ETHIOPIAN_NAMES, random.randint(1, 3))
            today = datetime.now().strftime("%Y-%m-%d")

            # --- Family Registry PDF ---
            fr_pdf = f"{prefix}_Family_Registry.pdf"
            write_simple_pdf(
                item_dir / fr_pdf,
                [
                    "Family Registry Record",
                    f"Sub-city: {sub_city.replace('_', ' ')}",
                    f"Woreda: {woreda_num:02d}",
                    f"House Number: {house_no}",
                    f"Registration Date: {today}",
                    "",
                    "Family Members:",
                    *[f"  - {m.replace('_', ' ')}" for m in members],
                ],
            )

            # --- Member + Vital Event PDFs ---
            for idx, member in enumerate(members, start=1):
                mid = f"{idx:03d}"
                member_name = member.replace("_", " ")

                member_pdf = f"{mid}_{member}.pdf"
                write_simple_pdf(
                    item_dir / member_pdf,
                    [
                        "Family Member Record",
                        f"Name: {member_name}",
                        f"House Number: {house_no}",
                        f"Sub-city: {sub_city.replace('_', ' ')}",
                        f"Woreda: {woreda_num:02d}",
                        f"Record Date: {today}",
                    ],
                )

                for ev in VITAL_EVENTS:
                    ev_pdf = f"{ev}_{mid}_{member}.pdf"
                    write_simple_pdf(
                        item_dir / ev_pdf,
                        [
                            f"{ev} Certificate",
                            f"Person: {member_name}",
                            f"House Number: {house_no}",
                            f"Sub-city: {sub_city.replace('_', ' ')}",
                            f"Woreda: {woreda_num:02d}",
                            f"Issue Date: {today}",
                        ],
                    )

print(f"✅ Sample PDF data generated under {BASE_DIR}")
