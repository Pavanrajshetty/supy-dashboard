import os
import json
from datetime import datetime, timezone

PROCESSED_DIR = os.path.join("src", "data", "processed", "leads_master")

MASTER_FILE = os.path.join(PROCESSED_DIR, "master.json")
STATE_FILE = os.path.join(PROCESSED_DIR, "build_state.json")
REPORT_FILE = os.path.join(PROCESSED_DIR, "build_report.json")

FOLDERS = {
    "hubspot_leads": "data/Hubspot/Leads",
    "meta_leads": "data/meta/leads",
    "sql": "data/Hubspot/SQL",
    "closed_won": "data/Hubspot/Closed-won"
}

FULL_REBUILD = os.getenv("FULL_REBUILD", "false").lower() == "true"


def load_json_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def normalize_email(email):
    if not email or not isinstance(email, str):
        return None
    email = email.strip().lower()
    return email if email else None


def now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_state():
    if FULL_REBUILD:
        return {k: [] for k in FOLDERS}
    if os.path.exists(STATE_FILE):
        state = load_json_file(STATE_FILE)
        if isinstance(state, dict):
            for k in FOLDERS:
                state.setdefault(k, [])
            return state
    return {k: [] for k in FOLDERS}


def get_new_files(folder, processed_files):
    all_files = sorted(os.listdir(folder)) if os.path.exists(folder) else []
    return [f for f in all_files if f.endswith(".json") and f not in processed_files]


def load_folder_data(folder, files):
    data = []
    for f in files:
        path = os.path.join(folder, f)
        rows = load_json_file(path)
        if isinstance(rows, list):
            data.extend(rows)
    return data


def build_meta_lookup(meta_rows):
    lookup = {}
    for row in meta_rows:
        email = row.get("custom_fields", {}).get("work_email") or row.get("email")
        norm = normalize_email(email)
        if not norm:
            continue
        lookup[norm] = row
    return lookup


def empty_row():
    return {
        "lead_id": None,
        "lead_link": None,
        "createdate": None,

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

        "campaign_id": None,
        "campaign_name": None,
        "adset_id": None,
        "adset_name": None,
        "ad_id": None,
        "ad_name": None,
        "form_name": None,
        "meta_match_found": False,

        "hs_v2_date_entered_salesqualifiedlead": None,
        "hs_v2_date_entered_opportunity": None,
        "hs_v2_date_entered_51997770": None,

        "sql": False,
        "sql_date": None,
        "sql_amount_usd": None,

        "deal_id": None,
        "deal_link": None,
        "deal_name": None,
        "deal_createdate": None,
        "deal_stage": None,
        "deal_amount": None,
        "deal_currency_code": None,
        "deal_amount_usd": None,
        "number_of_branches": None,

        "closed_won": False,
        "closed_won_date": None,
        "closed_won_amount_usd": None,

        "last_updated": now()
    }


def get_or_create_master_row(master_dict, lead_id):
    if lead_id not in master_dict:
        master_dict[lead_id] = empty_row()
        master_dict[lead_id]["lead_id"] = lead_id
    return master_dict[lead_id]


def fill_if_blank(target, source, fields):
    for field in fields:
        if target.get(field) in (None, "", False):
            value = source.get(field)
            if value not in (None, ""):
                target[field] = value


def set_if_present(target, source, source_field, target_field=None):
    if target_field is None:
        target_field = source_field
    value = source.get(source_field)
    if value not in (None, ""):
        target[target_field] = value


def apply_meta(m, meta_lookup):
    email_norm = normalize_email(m.get("email"))
    if not email_norm:
        return

    meta = meta_lookup.get(email_norm)
    if not meta:
        return

    set_if_present(m, meta, "campaign_id")
    set_if_present(m, meta, "campaign_name")
    set_if_present(m, meta, "adset_id")
    set_if_present(m, meta, "adset_name")
    set_if_present(m, meta, "ad_id")
    set_if_present(m, meta, "ad_name")
    set_if_present(m, meta, "form_name")

    if any([m.get("campaign_id"), m.get("adset_id"), m.get("ad_id"), m.get("campaign_name"), m.get("adset_name"), m.get("ad_name")]):
        m["meta_match_found"] = True


def main():
    state = load_state()
    report = {
        "time": now(),
        "stats": {
            "files_processed": {},
            "new_rows_created_from_leads": 0,
            "new_rows_created_from_sql": 0,
            "new_rows_created_from_closed_won": 0,
            "updated_from_leads": 0,
            "updated_from_sql": 0,
            "updated_from_closed_won": 0
        }
    }

    master = []
    if not FULL_REBUILD and os.path.exists(MASTER_FILE):
        master = load_json_file(MASTER_FILE)

    master_dict = {}
    if isinstance(master, list):
        for row in master:
            lead_id = row.get("lead_id")
            if lead_id:
                master_dict[lead_id] = row

    new_files = {}
    data = {}

    for key, folder in FOLDERS.items():
        files = get_new_files(folder, state.get(key, []))
        new_files[key] = files
        data[key] = load_folder_data(folder, files)

    report["stats"]["files_processed"] = new_files

    meta_lookup = build_meta_lookup(data["meta_leads"])

    # 1. HubSpot Leads
    for row in data["hubspot_leads"]:
        lead_id = row.get("lead_id")
        if not lead_id:
            continue

        is_new = lead_id not in master_dict
        m = get_or_create_master_row(master_dict, lead_id)

        fill_if_blank(m, row, [
            "lead_id", "lead_link", "createdate",
            "firstname", "lastname", "email", "phone", "jobtitle",
            "company", "country", "number_of_locations",
            "lifecyclestage", "hs_lead_status",
            "hs_analytics_source", "hs_analytics_source_data_1",
            "hs_analytics_source_data_2", "new_lead_source"
        ])

        apply_meta(m, meta_lookup)
        m["last_updated"] = now()

        if is_new:
            report["stats"]["new_rows_created_from_leads"] += 1
        else:
            report["stats"]["updated_from_leads"] += 1

    # 2. SQL
    for row in data["sql"]:
        lead_id = row.get("lead_id")
        if not lead_id:
            continue

        is_new = lead_id not in master_dict
        m = get_or_create_master_row(master_dict, lead_id)

        fill_if_blank(m, row, [
            "lead_id", "lead_link", "createdate",
            "firstname", "lastname", "email", "phone", "jobtitle",
            "company", "country", "number_of_locations",
            "lifecyclestage", "hs_lead_status",
            "hs_analytics_source", "hs_analytics_source_data_1",
            "hs_analytics_source_data_2", "new_lead_source"
        ])

        m["sql"] = True
        set_if_present(m, row, "hs_v2_date_entered_salesqualifiedlead")
        set_if_present(m, row, "hs_v2_date_entered_opportunity")
        set_if_present(m, row, "hs_v2_date_entered_salesqualifiedlead", "sql_date")
        set_if_present(m, row, "deal_amount_usd", "sql_amount_usd")

        for field in [
            "deal_id", "deal_link", "deal_name", "deal_createdate",
            "deal_stage", "deal_amount", "deal_currency_code",
            "deal_amount_usd", "number_of_branches"
        ]:
            set_if_present(m, row, field)

        apply_meta(m, meta_lookup)
        m["last_updated"] = now()

        if is_new:
            report["stats"]["new_rows_created_from_sql"] += 1
        else:
            report["stats"]["updated_from_sql"] += 1

    # 3. Closed Won
    for row in data["closed_won"]:
        lead_id = row.get("lead_id")
        if not lead_id:
            continue

        is_new = lead_id not in master_dict
        m = get_or_create_master_row(master_dict, lead_id)

        fill_if_blank(m, row, [
            "lead_id", "lead_link", "createdate",
            "firstname", "lastname", "email", "phone", "jobtitle",
            "company", "country", "number_of_locations",
            "lifecyclestage", "hs_lead_status",
            "hs_analytics_source", "hs_analytics_source_data_1",
            "hs_analytics_source_data_2", "new_lead_source"
        ])

        m["closed_won"] = True
        set_if_present(m, row, "hs_v2_date_entered_salesqualifiedlead")
        set_if_present(m, row, "hs_v2_date_entered_opportunity")
        set_if_present(m, row, "hs_v2_date_entered_51997770")
        set_if_present(m, row, "hs_v2_date_entered_51997770", "closed_won_date")
        set_if_present(m, row, "deal_amount_usd", "closed_won_amount_usd")

        for field in [
            "deal_id", "deal_link", "deal_name", "deal_createdate",
            "deal_stage", "deal_amount", "deal_currency_code",
            "deal_amount_usd", "number_of_branches"
        ]:
            set_if_present(m, row, field)

        apply_meta(m, meta_lookup)
        m["last_updated"] = now()

        if is_new:
            report["stats"]["new_rows_created_from_closed_won"] += 1
        else:
            report["stats"]["updated_from_closed_won"] += 1

    final_master = sorted(
        list(master_dict.values()),
        key=lambda x: (
            x.get("createdate") or "",
            x.get("lead_id") or ""
        )
    )

    save_json(MASTER_FILE, final_master)

    for k in state:
        state[k].extend(new_files[k])
    save_json(STATE_FILE, state)

    report["stats"]["total_rows"] = len(final_master)
    save_json(REPORT_FILE, report)

    print(f"Master build complete: {len(final_master)} rows")


if __name__ == "__main__":
    main()
