
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


def normalize_text(value):
    if value is None:
        return None
    if not isinstance(value, str):
        value = str(value)
    value = " ".join(value.strip().lower().split())
    return value or None


def normalize_email(email):
    return normalize_text(email)


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
        "meta_match_type": None,

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


def extract_meta_name(meta_row):
    first_name = meta_row.get("first_name")
    last_name = meta_row.get("last_name")
    full_name = meta_row.get("name")

    if full_name:
        return normalize_text(full_name)

    joined = " ".join([x for x in [first_name, last_name] if x])
    return normalize_text(joined) if joined else None


def extract_master_name(master_row):
    joined = " ".join([x for x in [master_row.get("firstname"), master_row.get("lastname")] if x])
    return normalize_text(joined) if joined else None


def build_meta_lookups(meta_rows):
    by_lead_id = {}
    by_email = {}
    by_name_company = {}

    for row in meta_rows:
        lead_id = row.get("lead_id")
        if lead_id:
            by_lead_id[str(lead_id)] = row

        for email in [
            row.get("custom_fields", {}).get("work_email"),
            row.get("email")
        ]:
            norm_email = normalize_email(email)
            if norm_email and norm_email not in by_email:
                by_email[norm_email] = row

        meta_name = extract_meta_name(row)
        meta_company = normalize_text(row.get("company_name"))
        if meta_name and meta_company:
            by_name_company[(meta_name, meta_company)] = row

    return by_lead_id, by_email, by_name_company


def map_meta_contact_fields(master_row, meta_row):
    if not master_row.get("firstname") and meta_row.get("first_name"):
        master_row["firstname"] = meta_row.get("first_name")
    if not master_row.get("lastname") and meta_row.get("last_name"):
        master_row["lastname"] = meta_row.get("last_name")
    if not master_row.get("phone") and meta_row.get("phone_number"):
        master_row["phone"] = meta_row.get("phone_number")
    if not master_row.get("company") and meta_row.get("company_name"):
        master_row["company"] = meta_row.get("company_name")
    if not master_row.get("country") and meta_row.get("country"):
        master_row["country"] = meta_row.get("country")
    if not master_row.get("email") and meta_row.get("email"):
        master_row["email"] = meta_row.get("email")
    if not master_row.get("createdate") and meta_row.get("created_time"):
        master_row["createdate"] = meta_row.get("created_time")


def apply_meta(master_row, by_lead_id, by_email, by_name_company):
    meta = None
    match_type = None

    lead_id = master_row.get("lead_id")
    if lead_id and str(lead_id) in by_lead_id:
        meta = by_lead_id[str(lead_id)]
        match_type = "lead_id"

    if meta is None:
        email_norm = normalize_email(master_row.get("email"))
        if email_norm and email_norm in by_email:
            meta = by_email[email_norm]
            match_type = "email"

    if meta is None:
        master_name = extract_master_name(master_row)
        master_company = normalize_text(master_row.get("company"))
        if master_name and master_company:
            key = (master_name, master_company)
            if key in by_name_company:
                meta = by_name_company[key]
                match_type = "name_company"

    if meta is None:
        return

    set_if_present(master_row, meta, "campaign_id")
    set_if_present(master_row, meta, "campaign_name")
    set_if_present(master_row, meta, "adset_id")
    set_if_present(master_row, meta, "adset_name")
    set_if_present(master_row, meta, "ad_id")
    set_if_present(master_row, meta, "ad_name")
    set_if_present(master_row, meta, "form_name")

    map_meta_contact_fields(master_row, meta)

    if any([
        master_row.get("campaign_name"),
        master_row.get("adset_name"),
        master_row.get("ad_name")
    ]):
        master_row["meta_match_found"] = True
        master_row["meta_match_type"] = match_type


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
            "updated_from_closed_won": 0,
            "meta_matched_rows": 0
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
                master_dict[str(lead_id)] = row

    new_files = {}
    data = {}

    for key, folder in FOLDERS.items():
        files = get_new_files(folder, state.get(key, []))
        new_files[key] = files
        data[key] = load_folder_data(folder, files)

    report["stats"]["files_processed"] = new_files

    meta_by_lead_id, meta_by_email, meta_by_name_company = build_meta_lookups(data["meta_leads"])

    # 1. HubSpot Leads
    for row in data["hubspot_leads"]:
        lead_id = row.get("lead_id")
        if not lead_id:
            continue

        lead_id = str(lead_id)
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

        apply_meta(m, meta_by_lead_id, meta_by_email, meta_by_name_company)
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

        lead_id = str(lead_id)
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

        apply_meta(m, meta_by_lead_id, meta_by_email, meta_by_name_company)
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

        lead_id = str(lead_id)
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

        apply_meta(m, meta_by_lead_id, meta_by_email, meta_by_name_company)
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

    report["stats"]["meta_matched_rows"] = sum(
        1 for row in final_master if row.get("meta_match_found")
    )
    report["stats"]["total_rows"] = len(final_master)

    save_json(MASTER_FILE, final_master)

    for k in state:
        state[k].extend(new_files[k])
    save_json(STATE_FILE, state)

    save_json(REPORT_FILE, report)

    print(f"Master build complete: {len(final_master)} rows")


if __name__ == "__main__":
    main()
