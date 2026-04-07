import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from collections import defaultdict


RAW_DIR = Path("data/meta/Data")
OUTPUT_DIR = Path("src/data/processed/meta_master")

MASTER_OUTPUT = OUTPUT_DIR / "build_report.json"
STATE_OUTPUT = OUTPUT_DIR / "build_state.json"
META_MASTER_OUTPUT = OUTPUT_DIR / "meta_master.json"


def safe_number(value, default=0):
    try:
        if value in (None, "", "null"):
            return default
        return float(value)
    except (ValueError, TypeError):
        return default


def is_placeholder_row(row: dict) -> bool:
    placeholder_values = {"string", "number", "string | null", "ad | adset | campaign"}
    values = {str(v).strip().lower() for v in row.values() if v is not None}
    return any(v in placeholder_values for v in values)


def load_json_file(file_path: Path):
    with file_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def get_file_hash(file_path: Path) -> str:
    return hashlib.md5(file_path.read_bytes()).hexdigest()


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def build_meta_master():
    agg = defaultdict(lambda: {
        "impressions": 0,
        "clicks": 0,
        "reach": 0,
        "leads": 0,
        "spend": 0.0
    })

    files_found = 0
    files_processed = 0
    skipped_rows = 0
    total_rows_seen = 0
    error_files = []

    file_states = {}

    json_files = sorted(RAW_DIR.glob("*.json"))
    files_found = len(json_files)

    print(f"Found {files_found} files in {RAW_DIR}")

    for file_path in json_files:
        try:
            data = load_json_file(file_path)

            if not isinstance(data, list):
                error_files.append({
                    "file": file_path.name,
                    "error": "Not a JSON array"
                })
                continue

            file_states[file_path.name] = {
                "hash": get_file_hash(file_path),
                "rows": len(data)
            }

            file_processed = False

            for row in data:
                total_rows_seen += 1

                if not isinstance(row, dict):
                    skipped_rows += 1
                    continue

                if is_placeholder_row(row):
                    skipped_rows += 1
                    continue

                date = row.get("date") or file_path.stem
                campaign_id = row.get("campaign_id")
                campaign_name = row.get("campaign_name")

                adset_id = row.get("adset_id")
                adset_name = row.get("adset_name")

                ad_id = row.get("ad_id")
                ad_name = row.get("ad_name")

                country = row.get("country")
                level = row.get("level")

                if not campaign_id or not campaign_name:
                    skipped_rows += 1
                    continue

                key = (
                    str(date),
                    str(campaign_id),
                    str(campaign_name),
                    str(adset_id) if adset_id else None,
                    str(adset_name) if adset_name else None,
                    str(ad_id) if ad_id else None,
                    str(ad_name) if ad_name else None,
                    str(country) if country else None,
                    str(level) if level else None,
                )

                agg[key]["impressions"] += int(safe_number(row.get("impressions"), 0))
                agg[key]["clicks"] += int(safe_number(row.get("clicks"), 0))
                agg[key]["reach"] += int(safe_number(row.get("reach"), 0))
                agg[key]["leads"] += int(safe_number(row.get("leads"), 0))
                agg[key]["spend"] = round(agg[key]["spend"] + safe_number(row.get("spend"), 0.0), 2)

                file_processed = True

            if file_processed:
                files_processed += 1
                print(f"Processed: {file_path.name}")

        except Exception as e:
            error_files.append({
                "file": file_path.name,
                "error": str(e)
            })
            print(f"Error in {file_path.name}: {e}")

    meta_master = []
    for key, value in agg.items():
        meta_master.append({
            "date": key[0],
            "campaign_id": key[1],
            "campaign_name": key[2],
            "adset_id": key[3],
            "adset_name": key[4],
            "ad_id": key[5],
            "ad_name": key[6],
            "country": key[7],
            "level": key[8],
            "impressions": value["impressions"],
            "clicks": value["clicks"],
            "reach": value["reach"],
            "leads": value["leads"],
            "spend": round(value["spend"], 2),
        })

    meta_master.sort(
        key=lambda x: (
            x["date"] or "",
            x["campaign_name"] or "",
            x["adset_name"] or "",
            x["ad_name"] or "",
            x["country"] or "",
            x["level"] or "",
        )
    )

    report = {
        "build_name": "meta_master",
        "built_at": utc_now(),
        "source_dir": str(RAW_DIR),
        "output_file": str(META_MASTER_OUTPUT),
        "files_found": files_found,
        "files_processed": files_processed,
        "total_rows_seen": total_rows_seen,
        "skipped_rows": skipped_rows,
        "output_rows": len(meta_master),
        "error_count": len(error_files),
        "errors": error_files
    }

    state = {
        "build_name": "meta_master",
        "last_built_at": utc_now(),
        "source_dir": str(RAW_DIR),
        "output_dir": str(OUTPUT_DIR),
        "files_found": files_found,
        "files_processed": files_processed,
        "output_rows": len(meta_master),
        "file_states": file_states
    }

    return meta_master, report, state


def save_json(data, output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Saved: {output_path}")


def main():
    if not RAW_DIR.exists():
        print(f"Raw directory not found: {RAW_DIR}")
        return

    meta_master, report, state = build_meta_master()

    save_json(meta_master, META_MASTER_OUTPUT)
    save_json(report, MASTER_OUTPUT)
    save_json(state, STATE_OUTPUT)


if __name__ == "__main__":
    main()
