import json
import hashlib
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


RAW_DIR = Path("data/meta/Data")
PROCESSED_DIR = Path("data/processed/meta")
OUTPUT_DIR = Path("src/data/processed/meta_master")

ADSET_OUTPUT = PROCESSED_DIR / "adset_master.json"
GEO_OUTPUT = PROCESSED_DIR / "geo_master.json"

MASTER_OUTPUT = OUTPUT_DIR / "build_report.json"
STATE_OUTPUT = OUTPUT_DIR / "build_state.json"
META_MASTER_OUTPUT = OUTPUT_DIR / "meta_master.json"


def utc_now():
    return datetime.now(timezone.utc).isoformat()


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


def load_json_file(file_path: Path, default=None):
    if default is None:
        default = []
    try:
        with file_path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def save_json(data, output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Saved: {output_path}")


def get_date_from_filename(file_path: Path) -> str:
    return file_path.stem


def get_file_hash(file_path: Path) -> str:
    return hashlib.md5(file_path.read_bytes()).hexdigest()


def load_state():
    state = load_json_file(STATE_OUTPUT, default={})
    if not isinstance(state, dict):
        state = {}

    if "file_states" not in state or not isinstance(state["file_states"], dict):
        state["file_states"] = {}

    return state


def build_row_key(row: dict):
    return (
        row.get("date"),
        row.get("campaign_id"),
        row.get("campaign_name"),
        row.get("adset_id"),
        row.get("adset_name"),
        row.get("ad_id"),
        row.get("ad_name"),
        row.get("country"),
        row.get("level"),
    )


def aggregate_rows(rows):
    agg = defaultdict(lambda: {
        "impressions": 0,
        "clicks": 0,
        "reach": 0,
        "leads": 0,
        "spend": 0.0
    })

    skipped_rows = 0
    total_rows_seen = 0

    for row in rows:
        total_rows_seen += 1

        if not isinstance(row, dict):
            skipped_rows += 1
            continue

        if is_placeholder_row(row):
            skipped_rows += 1
            continue

        date = row.get("date")
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
            str(date) if date is not None else None,
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
        agg[key]["spend"] = round(
            agg[key]["spend"] + safe_number(row.get("spend"), 0.0),
            2
        )

    output = []
    for key, value in agg.items():
        output.append({
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

    return output, total_rows_seen, skipped_rows


def rows_from_file(file_path: Path):
    data = load_json_file(file_path, default=[])

    if not isinstance(data, list):
        raise ValueError("Not a JSON array")

    normalized_rows = []
    for row in data:
        if not isinstance(row, dict):
            normalized_rows.append(row)
            continue

        row_copy = dict(row)
        if "date" not in row_copy or not row_copy.get("date"):
            row_copy["date"] = get_date_from_filename(file_path)
        if "level" not in row_copy:
            row_copy["level"] = None

        normalized_rows.append(row_copy)

    return normalized_rows


def sort_meta_master(rows):
    rows.sort(
        key=lambda x: (
            x.get("date") or "",
            x.get("campaign_name") or "",
            x.get("adset_name") or "",
            x.get("ad_name") or "",
            x.get("country") or "",
            x.get("level") or "",
        )
    )


def main():
    if not RAW_DIR.exists():
        print(f"Raw directory not found: {RAW_DIR}")
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    previous_state = load_state()
    previous_file_states = previous_state.get("file_states", {})

    existing_master = load_json_file(META_MASTER_OUTPUT, default=[])
    if not isinstance(existing_master, list):
        existing_master = []

    existing_by_date = defaultdict(list)
    for row in existing_master:
        existing_by_date[row.get("date")].append(row)

    json_files = sorted(RAW_DIR.glob("*.json"))
    files_found = len(json_files)

    changed_files = []
    unchanged_files = []
    error_files = []

    current_file_states = {}
    touched_dates = set()

    total_rows_seen = 0
    skipped_rows = 0
    files_processed = 0

    for file_path in json_files:
        file_hash = get_file_hash(file_path)

        current_file_states[file_path.name] = {
            "hash": file_hash
        }

        old_hash = previous_file_states.get(file_path.name, {}).get("hash")
        if old_hash == file_hash:
            unchanged_files.append(file_path.name)
            continue

        changed_files.append(file_path)

    for file_path in changed_files:
        try:
            raw_rows = rows_from_file(file_path)

            for row in raw_rows:
                if isinstance(row, dict):
                    row_date = row.get("date") or get_date_from_filename(file_path)
                    touched_dates.add(row_date)
                else:
                    touched_dates.add(get_date_from_filename(file_path))

            aggregated_rows, seen_count, skipped_count = aggregate_rows(raw_rows)

            total_rows_seen += seen_count
            skipped_rows += skipped_count
            files_processed += 1

            file_date = get_date_from_filename(file_path)
            current_file_states[file_path.name]["rows"] = len(raw_rows)
            current_file_states[file_path.name]["aggregated_rows"] = len(aggregated_rows)
            current_file_states[file_path.name]["date"] = file_date

            existing_by_date[file_date] = aggregated_rows

            print(f"Processed changed file: {file_path.name}")

        except Exception as e:
            error_files.append({
                "file": file_path.name,
                "error": str(e)
            })
            print(f"Error in {file_path.name}: {e}")

    final_master = []
    for date_key in sorted(existing_by_date.keys()):
        final_master.extend(existing_by_date[date_key])

    sort_meta_master(final_master)

    report = {
        "build_name": "meta_master",
        "built_at": utc_now(),
        "source_dir": str(RAW_DIR),
        "output_file": str(META_MASTER_OUTPUT),
        "files_found": files_found,
        "files_processed": files_processed,
        "files_unchanged": len(unchanged_files),
        "changed_files": [f.name for f in changed_files],
        "total_rows_seen": total_rows_seen,
        "skipped_rows": skipped_rows,
        "output_rows": len(final_master),
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
        "output_rows": len(final_master),
        "file_states": current_file_states
    }

    save_json(final_master, META_MASTER_OUTPUT)
    save_json(report, MASTER_OUTPUT)
    save_json(state, STATE_OUTPUT)

    print(f"Files found: {files_found}")
    print(f"Files processed this run: {files_processed}")
    print(f"Files unchanged: {len(unchanged_files)}")
    print(f"Output rows: {len(final_master)}")


if __name__ == "__main__":
    main()
