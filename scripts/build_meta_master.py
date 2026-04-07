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


def normalize_text(value):
    if value is None:
        return None
    if not isinstance(value, str):
        value = str(value)
    value = " ".join(value.strip().lower().split())
    return value or None


def normalize_email(value):
    return normalize_text(value)


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


def load_state():
    if FULL_REBUILD:
        return {k: [] for k in FOLDERS}

    state = load_json_file(STATE_FILE, {})
    if not isinstance(state, dict):
        state = {}

    for k in FOLDERS:
        state.setdefault(k, [])

    return state


def get_json_files(folder):
    if not os.path.exists(folder):
        return []
    return sorted([f for f in os.listdir(folder) if f.endswith(".json")])


def get_new_files(folder, processed_files):
    files = get_json_files(folder)
    return [f for f in files if f not in processed_files]


def load_rows_from_files(folder, files):
    rows = []
    for fname in files:
        path = os.path.join(folder, fname)
        data = load_json_file(path, [])
        if isinstance(data, list):
            rows.extend(data)
    return rows


def set_field(row, field, value):
    # database-like: if key present in source, store exact value even if None
    row[field] = value


def upsert_lead_row(master_dict, lead_row):
    lead_id = lead_row.get("lead_id")
    if not lead_id:
        return False, False

    lead_id = str(lead_id)
    created = False

    if lead_id not in master_dict:
        master_dict[lead_id] = empty_row()
        master_dict[lead_id]["lead_id"] = lead_id
        created = True

    row = master_dict[lead_id]

    lead_fields = [
        "lead_id",
        "lead_link",
        "createdate",
        "hs_v2_date_entered_marketingqualifiedlead",
        "hs_v2_date_entered_salesqualifiedlead",
        "hs_v2_date_entered_opportunity",
        "deal_id",
        "deal_link",
        "deal_name",
        "deal_createdate",
        "deal_stage",
        "deal_amount",
        "deal_amount_usd",
        "closedate",
        "hs_v2_date_entered_51997770",
        "deal_currency_code",
        "number_of_branches",
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
        "last_updated"
    ]

    for field in lead_fields:
        if field in lead_row:
            set_field(row, field, lead_row.get(field))

    return created, True


def build_meta_indexes(meta_rows):
    by_work_email = {}
    by_email = {}
    by_firstname_company = {}

    for meta in meta_rows:
        work_email = normalize_email(meta.get("custom_fields", {}).get("work_email"))
        email = normalize_email(meta.get("email"))
        first_name = normalize_text(meta.get("first_name"))
        company_name = normalize_text(meta.get("company_name"))

        if work_email and work_email not in by_work_email:
            by_work_email[work_email] = meta

        if email and email not in by_email:
            by_email[email] = meta

        if first_name and company_name:
            key = (first_name, company_name)
            if key not in by_firstname_company:
                by_firstname_company[key] = meta

    return by_work_email, by_email, by_firstname_company


def apply_meta_to_row(row, by_work_email, by_email, by_firstname_company):
    meta = None
    match_type = None

    hubspot_email = normalize_email(row.get("email"))
    hubspot_firstname = normalize_text(row.get("firstname"))
    hubspot_company = normalize_text(row.get("company"))

    if hubspot_email and hubspot_email in by_work_email:
        meta = by_work_email[hubspot_email]
        match_type = "email_to_work_email"
    elif hubspot_email and hubspot_email in by_email:
        meta = by_email[hubspot_email]
        match_type = "email_to_email"
    elif hubspot_firstname and hubspot_company:
        key = (hubspot_firstname, hubspot_company)
        if key in by_firstname_company:
            meta = by_firstname_company[key]
            match_type = "firstname_company"

    if not meta:
        return False

    # only enrichment fields from meta
    row["campaign_id"] = meta.get("campaign_id")
    row["campaign_name"] = meta.get("campaign_name")
    row["adset_id"] = meta.get("adset_id")
    row["adset_name"] = meta.get("adset_name")
    row["ad_id"] = meta.get("ad_id")
    row["ad_name"] = meta.get("ad_name")
    row["form_name"] = meta.get("form_name")
    row["meta_match_found"] = True
    row["meta_match_type"] = match_type

    return True


def main():
    os.makedirs(PROCESSED_DIR, exist_ok=True)

    state = load_state()
    report = {
        "time": now(),
        "stats": {
            "files_processed": {},
            "new_rows_created_from_leads": 0,
            "updated_from_leads": 0,
            "meta_matched_rows": 0,
            "total_master_rows": 0
        }
    }

    if FULL_REBUILD:
        master_list = []
    else:
        master_list = load_json_file(MASTER_FILE, [])

    master_dict = {}
    if isinstance(master_list, list):
        for row in master_list:
            lead_id = row.get("lead_id")
            if lead_id:
                master_dict[str(lead_id)] = row

    # ONLY leads + meta for now
    new_lead_files = get_new_files(FOLDERS["hubspot_leads"], state["hubspot_leads"])
    new_meta_files = get_new_files(FOLDERS["meta_leads"], state["meta_leads"])

    report["stats"]["files_processed"]["hubspot_leads"] = new_lead_files
    report["stats"]["files_processed"]["meta_leads"] = new_meta_files
    report["stats"]["files_processed"]["sql"] = []
    report["stats"]["files_processed"]["closed_won"] = []

    lead_rows = load_rows_from_files(FOLDERS["hubspot_leads"], new_lead_files)
    meta_rows = load_rows_from_files(FOLDERS["meta_leads"], new_meta_files)

    touched_lead_ids = set()

    # step 1: upsert new leads into master
    for lead_row in lead_rows:
        created, updated = upsert_lead_row(master_dict, lead_row)
        lead_id = lead_row.get("lead_id")
        if lead_id:
            touched_lead_ids.add(str(lead_id))

        if created:
            report["stats"]["new_rows_created_from_leads"] += 1
        elif updated:
            report["stats"]["updated_from_leads"] += 1

    # step 2: meta enrichment on touched rows only
    if meta_rows:
        by_work_email, by_email, by_firstname_company = build_meta_indexes(meta_rows)

        for lead_id in touched_lead_ids:
            row = master_dict.get(lead_id)
            if not row:
                continue
            matched = apply_meta_to_row(row, by_work_email, by_email, by_firstname_company)
            if matched:
                report["stats"]["meta_matched_rows"] += 1

    # sort by createdate then lead_id
    final_master = list(master_dict.values())
    final_master.sort(key=lambda x: (
        x.get("createdate") or "",
        x.get("lead_id") or ""
    ))

    report["stats"]["total_master_rows"] = len(final_master)

    save_json(MASTER_FILE, final_master)
    save_json(REPORT_FILE, report)

    # update state only after successful save
    state["hubspot_leads"] = sorted(list(set(state["hubspot_leads"] + new_lead_files)))
    state["meta_leads"] = sorted(list(set(state["meta_leads"] + new_meta_files)))
    state.setdefault("sql", [])
    state.setdefault("closed_won", [])
    save_json(STATE_FILE, state)

    print(f"Done. master rows={len(final_master)}, new leads={len(new_lead_files)}, new meta={len(new_meta_files)}")


if __name__ == "__main__":
    main()
