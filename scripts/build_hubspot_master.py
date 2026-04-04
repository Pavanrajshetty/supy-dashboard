import json
from pathlib import Path


BASE_DIR = Path("data/Hubspot")
LEADS_DIR = BASE_DIR / "Leads"
SQL_DIR = BASE_DIR / "SQL"
CLOSE_WON_DIR = BASE_DIR / "Close-Won"
OUTPUT_FILE = Path("data/processed/master.json")


def load_json_files(folder: Path):
    rows = []
    if not folder.exists():
        return rows

    for file_path in sorted(folder.glob("*.json")):
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                rows.extend(data)
            else:
                print(f"Skipping {file_path} because it is not a JSON array")
    return rows


def main():
    leads = load_json_files(LEADS_DIR)
    sql_rows = load_json_files(SQL_DIR)
    close_won_rows = load_json_files(CLOSE_WON_DIR)

    sql_ids = {row["id"] for row in sql_rows if "id" in row}
    close_won_ids = {row["id"] for row in close_won_rows if "id" in row}

    master = []

    for lead in leads:
        lead_id = lead.get("id")
        enriched_lead = {
            **lead,
            "sql": lead_id in sql_ids,
            "closed_won": lead_id in close_won_ids,
        }
        master.append(enriched_lead)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(master, f, indent=2, ensure_ascii=False)

    print(f"Master file created: {OUTPUT_FILE}")
    print(f"Total leads: {len(master)}")
    print(f"SQL true count: {sum(1 for row in master if row['sql'])}")
    print(f"Closed Won true count: {sum(1 for row in master if row['closed_won'])}")


if __name__ == "__main__":
    main()
