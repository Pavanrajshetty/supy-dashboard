import os
import json
from datetime import datetime, timezone

PROCESSED_DIR = os.path.join("src", "data", "processed", "leads_master")

MASTER_FILE = os.path.join(PROCESSED_DIR, "master.json")
STATE_FILE = os.path.join(PROCESSED_DIR, "build_state_sql.json")
REPORT_FILE = os.path.join(PROCESSED_DIR, "build_report_sql.json")

SQL_FOLDER = os.path.join("data", "Hubspot", "SQL")

FULL_REBUILD = os.getenv("FULL_REBUILD", "false").lower() == "true"


def now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_json_file(path, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def get_json_files(folder):
    if not os.path.exists(folder):
        return []
    return sorted([f for f in os.listdir(folder) if f.endswith(".json")])


def load_state():
    if FULL_REBUILD:
        return {"sql_files_processed": []}

    state = load_json_file(STATE_FILE, {})
    if not isinstance(state, dict):
        state = {}

    state.setdefault("sql_files_processed", [])
    return state


def get_latest_unprocessed_sql_file(folder, processed_files):
    all_files = get_json_files(folder)
    unprocessed = [f for f in all_files if f not in processed_files]
    if not unprocessed:
        return None
    return unprocessed[-1]


def empty_row():
    return {
        "lead_id": None,
        "lead_link": None,

        "createdate": None,
        "hs_v2_date_entered_marketingqualifiedlead": None,
        "hs_v2_date_entered_salesqualifiedlead": None,
        "hs_v2_date_entered_opportunity": None,

        "deal_id": None,
        "deal_link": None,
        "deal_name": None,
        "deal_createdate": None,
        "deal_stage": None,
        "deal_amount": None,
        "deal_amount_usd": None,
        "closedate": None,
        "hs_v2_date_entered_51997770": None,
        "deal_currency_code": None,
        "number_of_branches": None,

        "firstname": None,
        "lastname": None,
        "email": None,
        "phone": None,
        "jobtitle": None,
        "company": None,
        "country": None,
        "number_of_locations": None,

        "lifecyclestage": None,
        "hs_lead_status": None,

        "hs_analytics_source": None,
        "hs_analytics_source_data_1": None,
        "hs_analytics_source_data_2": None,
        "new_lead_source": None,

        "utm_source": None,
        "utm_medium": None,
        "utm_campaign": None,
        "utm_content": None,

        "campaign_id": None,
        "campaign_name": None,
        "adset_id": None,
        "adset_name": None,
        "ad_id": None,
        "ad_name": None,
        "form_name": None,
        "meta_match_found": False,
        "meta_match_type": None,

        "sql": False,
        "sql_date": None,
        "sql_amount_usd": None,

        "closed_won": False,
        "closed_won_date": None,
        "closed_won_amount_usd": None,

        "last_updated": now()
    }


def set_exact_value(target_row, field, source_row):
    if field in source_row:
        target_row[field] = source_row.get(field)


def upsert_sql_row(master_dict, sql_row):
    lead_id = sql_row.get("lead_id")
    if not lead_id:
        return False, False, None

    lead_id = str(lead_id)
    created = False

    if lead_id not in master_dict:
        master_dict[lead_id] = empty_row()
        master_dict[lead_id]["lead_id"] = lead_id
        created = True

    row = master_dict[lead_id]

    sql_fields = [
        "lead_id",
        "lead_link",

        "createdate",
        "hs_v2_date_entered_marketingqualifiedlead",
        "hs_v2_date_entered_salesqualifiedlead",
        "hs_v2_date_entered_opportunity",

        "firstname",
        "lastname",
        "email",
        "phone",
        "jobtitle",
        "company",
        "country",
        "number_of_locations",

        "lifecyclestage",
        "hs_lead_status",

        "hs_analytics_source",
        "hs_analytics_source_data_1",
        "hs_analytics_source_data_2",
        "new_lead_source",

        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",

        "deal_id",
        "deal_link",
        "deal_name",
        "deal_createdate",
        "deal_stage",
        "deal_amount",
        "deal_currency_code",
        "deal_amount_usd",
        "number_of_branches",

        "last_updated"
    ]

    for field in sql_fields:
        set_exact_value(row, field, sql_row)

    row["sql"] = True
    row["sql_date"] = sql_row.get("hs_v2_date_entered_salesqualifiedlead")
    row["sql_amount_usd"] = sql_row.get("deal_amount_usd")

    return created, True, lead_id


def main():
    os.makedirs(PROCESSED_DIR, exist_ok=True)

    if not os.path.exists(MASTER_FILE):
        raise FileNotFoundError(
            f"Master file not found at {MASTER_FILE}. Run leads master first."
        )

    state = load_state()

    report = {
        "time": now(),
        "stats": {
            "sql_file_processed": None,
            "new_rows_created_from_sql": 0,
            "updated_from_sql": 0,
            "total_master_rows": 0
        }
    }

    master_list = load_json_file(MASTER_FILE, [])
    if not isinstance(master_list, list):
        master_list = []

    master_dict = {}
    for row in master_list:
        lead_id = row.get("lead_id")
        if lead_id:
            master_dict[str(lead_id)] = row

    latest_sql_file = get_latest_unprocessed_sql_file(
        SQL_FOLDER,
        state["sql_files_processed"]
    )

    if not latest_sql_file:
        report["stats"]["total_master_rows"] = len(master_dict)
        save_json(REPORT_FILE, report)
        print("No new SQL file found.")
        return

    report["stats"]["sql_file_processed"] = latest_sql_file

    sql_rows = load_json_file(os.path.join(SQL_FOLDER, latest_sql_file), [])
    if not isinstance(sql_rows, list):
        sql_rows = []

    for sql_row in sql_rows:
        created, updated, _ = upsert_sql_row(master_dict, sql_row)
        if created:
            report["stats"]["new_rows_created_from_sql"] += 1
        elif updated:
            report["stats"]["updated_from_sql"] += 1

    final_master = list(master_dict.values())
    final_master.sort(key=lambda x: (
        x.get("createdate") or "",
        x.get("lead_id") or ""
    ))

    report["stats"]["total_master_rows"] = len(final_master)

    save_json(MASTER_FILE, final_master)
    save_json(REPORT_FILE, report)

    state["sql_files_processed"] = sorted(
        list(set(state["sql_files_processed"] + [latest_sql_file]))
    )
    save_json(STATE_FILE, state)

    print(
        f"Done. SQL file processed={latest_sql_file}, "
        f"new rows={report['stats']['new_rows_created_from_sql']}, "
        f"updated rows={report['stats']['updated_from_sql']}, "
        f"master rows={len(final_master)}"
    )


if __name__ == "__main__":
    main()
