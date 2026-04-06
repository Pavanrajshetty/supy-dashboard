import os
import json
from datetime import datetime

BASE_DIR = "data"
PROCESSED_DIR = os.path.join(BASE_DIR, "processed", "hubspot")

MASTER_FILE = os.path.join(PROCESSED_DIR, "hubspot_master.json")
STATE_FILE = os.path.join(PROCESSED_DIR, "build_state.json")
REPORT_FILE = os.path.join(PROCESSED_DIR, "build_report.json")

FOLDERS = {
    "hubspot_leads": "data/Hubspot/Leads",
    "meta_leads": "data/meta/leads",
    "sql": "data/Hubspot/SQL",
    "closed_won": "data/Hubspot/closed won"
}

FULL_REBUILD = os.getenv("FULL_REBUILD", "false").lower() == "true"


def load_json_file(path):
    try:
        with open(path, "r") as f:
            return json.load(f)
    except:
        return []


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def normalize_email(email):
    if not email:
        return None
    return email.strip().lower()


def now():
    return datetime.utcnow().isoformat()


def load_state():
    if FULL_REBUILD:
        return {k: [] for k in FOLDERS}
    if os.path.exists(STATE_FILE):
        return load_json_file(STATE_FILE)
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
        "company": None,
        "country": None,
        "number_of_locations": None,
        "lifecyclestage": None,
        "hs_lead_status": None,
        "hs_analytics_source": None,
        "hs_analytics_source_data_1": None,
        "hs_analytics_source_data_2": None,
        "new_lead_source": None,

        "campaign_name": None,
        "adset_name": None,
        "ad_name": None,
        "meta_match_found": False,

        "sql": False,
        "sql_date": None,

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
        "closedate": None,

        "last_updated": now()
    }


def main():
    state = load_state()
    report = {"time": now(), "stats": {}}

    master = []
    if not FULL_REBUILD and os.path.exists(MASTER_FILE):
        master = load_json_file(MASTER_FILE)

    master_dict = {row["lead_id"]: row for row in master if row.get("lead_id")}

    new_files = {}
    data = {}

    for key, folder in FOLDERS.items():
        files = get_new_files(folder, state.get(key, []))
        new_files[key] = files
        data[key] = load_folder_data(folder, files)

    report["stats"]["files_processed"] = new_files

    meta_lookup = build_meta_lookup(data["meta_leads"])

    for row in data["hubspot_leads"]:
        lead_id = row.get("lead_id")
        if not lead_id:
            continue

        if lead_id not in master_dict:
            master_dict[lead_id] = empty_row()

        m = master_dict[lead_id]

        for field in [
            "lead_id","lead_link","createdate","firstname","lastname","email",
            "phone","company","country","number_of_locations",
            "lifecyclestage","hs_lead_status",
            "hs_analytics_source","hs_analytics_source_data_1",
            "hs_analytics_source_data_2","new_lead_source"
        ]:
            if not m.get(field):
                m[field] = row.get(field)

        email_norm = normalize_email(m.get("email"))
        meta = meta_lookup.get(email_norm)

        if meta and not m["meta_match_found"]:
            m["campaign_name"] = meta.get("campaign_name")
            m["adset_name"] = meta.get("adset_name")
            m["ad_name"] = meta.get("ad_name")
            m["meta_match_found"] = True

        m["last_updated"] = now()

    for row in data["sql"]:
        lead_id = row.get("lead_id")
        if not lead_id:
            continue

        if lead_id not in master_dict:
            master_dict[lead_id] = empty_row()

        m = master_dict[lead_id]

        m["sql"] = True
        m["sql_date"] = row.get("hs_v2_date_entered_salesqualifiedlead")

        for field in [
            "deal_id","deal_link","deal_name","deal_createdate",
            "deal_stage","deal_amount","deal_currency_code",
            "deal_amount_usd","number_of_branches"
        ]:
            m[field] = row.get(field)

        m["last_updated"] = now()

    for row in data["closed_won"]:
        lead_id = row.get("lead_id")
        if not lead_id:
            continue

        if lead_id not in master_dict:
            master_dict[lead_id] = empty_row()

        m = master_dict[lead_id]

        m["closed_won"] = True
        m["closedate"] = row.get("closedate")

        for field in [
            "deal_id","deal_link","deal_name","deal_createdate",
            "deal_stage","deal_amount","deal_currency_code",
            "deal_amount_usd","number_of_branches"
        ]:
            m[field] = row.get(field)

        m["last_updated"] = now()

    final_master = list(master_dict.values())
    save_json(MASTER_FILE, final_master)

    for k in state:
        state[k].extend(new_files[k])
    save_json(STATE_FILE, state)

    report["stats"]["total_rows"] = len(final_master)
    save_json(REPORT_FILE, report)

    print("Master build complete:", len(final_master))


if __name__ == "__main__":
    main()
