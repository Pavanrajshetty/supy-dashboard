import json
from collections import defaultdict
from pathlib import Path


RAW_DIR = Path("data/meta/Data")
PROCESSED_DIR = Path("data/processed/meta")

ADSET_OUTPUT = PROCESSED_DIR / "adset_master.json"
GEO_OUTPUT = PROCESSED_DIR / "geo_master.json"


def is_placeholder_row(row: dict) -> bool:
    placeholder_values = {"string", "number", "string | null", "ad | adset | campaign"}
    values = {str(v).strip().lower() for v in row.values() if v is not None}
    return any(v in placeholder_values for v in values)


def safe_number(value, default=0):
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (ValueError, TypeError):
        return default


def load_json_file(file_path: Path):
    with file_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def get_date_from_filename(file_path: Path) -> str:
    return file_path.stem


def process_files():
    adset_agg = defaultdict(lambda: {
        "impressions": 0,
        "clicks": 0,
        "reach": 0,
        "leads": 0,
        "spend": 0.0
    })

    geo_agg = defaultdict(lambda: {
        "impressions": 0,
        "clicks": 0,
        "reach": 0,
        "leads": 0,
        "spend": 0.0
    })

    skipped_rows = 0
    processed_files = 0
    found_files = list(RAW_DIR.glob("*.json"))

    print(f"Found {len(found_files)} JSON files in {RAW_DIR}")

    for file_path in found_files:
        try:
            data = load_json_file(file_path)

            if not isinstance(data, list):
                print(f"Skipping {file_path.name}: not a JSON array")
                continue

            file_date = get_date_from_filename(file_path)
            file_processed = False

            for row in data:
                if not isinstance(row, dict):
                    skipped_rows += 1
                    continue

                if is_placeholder_row(row):
                    skipped_rows += 1
                    continue

                campaign_id = row.get("campaign_id")
                campaign_name = row.get("campaign_name")
                adset_id = row.get("adset_id")
                adset_name = row.get("adset_name")
                country = row.get("country")

                impressions = int(safe_number(row.get("impressions"), 0))
                clicks = int(safe_number(row.get("clicks"), 0))
                reach = int(safe_number(row.get("reach"), 0))
                leads = int(safe_number(row.get("leads"), 0))
                spend = round(safe_number(row.get("spend"), 0.0), 2)

                if campaign_id and campaign_name and adset_id and adset_name:
                    adset_key = (
                        file_date,
                        str(campaign_id),
                        str(campaign_name),
                        str(adset_id),
                        str(adset_name),
                    )
                    adset_agg[adset_key]["impressions"] += impressions
                    adset_agg[adset_key]["clicks"] += clicks
                    adset_agg[adset_key]["reach"] += reach
                    adset_agg[adset_key]["leads"] += leads
                    adset_agg[adset_key]["spend"] = round(adset_agg[adset_key]["spend"] + spend, 2)
                else:
                    skipped_rows += 1

                if campaign_id and campaign_name and country:
                    geo_key = (
                        file_date,
                        str(campaign_id),
                        str(campaign_name),
                        str(country),
                    )
                    geo_agg[geo_key]["impressions"] += impressions
                    geo_agg[geo_key]["clicks"] += clicks
                    geo_agg[geo_key]["reach"] += reach
                    geo_agg[geo_key]["leads"] += leads
                    geo_agg[geo_key]["spend"] = round(geo_agg[geo_key]["spend"] + spend, 2)
                else:
                    skipped_rows += 1

                file_processed = True

            if file_processed:
                processed_files += 1
                print(f"Processed: {file_path.name}")

        except Exception as e:
            print(f"Error processing {file_path.name}: {e}")

    adset_master = [
        {
            "date": key[0],
            "campaign_id": key[1],
            "campaign_name": key[2],
            "adset_id": key[3],
            "adset_name": key[4],
            "impressions": value["impressions"],
            "clicks": value["clicks"],
            "reach": value["reach"],
            "leads": value["leads"],
            "spend": round(value["spend"], 2),
        }
        for key, value in adset_agg.items()
    ]

    geo_master = [
        {
            "date": key[0],
            "campaign_id": key[1],
            "campaign_name": key[2],
            "country": key[3],
            "impressions": value["impressions"],
            "clicks": value["clicks"],
            "reach": value["reach"],
            "leads": value["leads"],
            "spend": round(value["spend"], 2),
        }
        for key, value in geo_agg.items()
    ]

    adset_master.sort(key=lambda x: (x["date"], x["campaign_name"], x["adset_name"]))
    geo_master.sort(key=lambda x: (x["date"], x["campaign_name"], x["country"]))

    print(f"Files processed: {processed_files}")
    print(f"Rows skipped: {skipped_rows}")
    print(f"Adset master rows: {len(adset_master)}")
    print(f"Geo master rows: {len(geo_master)}")

    return adset_master, geo_master


def save_json(data, output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Saved: {output_path}")


def main():
    if not RAW_DIR.exists():
        print(f"Raw directory not found: {RAW_DIR}")
        return

    adset_master, geo_master = process_files()
    save_json(adset_master, ADSET_OUTPUT)
    save_json(geo_master, GEO_OUTPUT)


if __name__ == "__main__":
    main()
