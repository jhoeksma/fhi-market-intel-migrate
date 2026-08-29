import os, csv, hashlib

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

def log(*a):
    print(*a, flush=True)

def run():
    output = []
    def log(*a):
        line = " ".join(str(x) for x in a)
        output.append(line)
        print(line, flush=True)

    for fname in ["schema.sql", "system_category.csv", "market_category.csv",
                  "market_size_estimate.csv", "supplier_revenue.csv",
                  "national_programme.csv", "supplier_slim.csv"]:
        path = os.path.join(DATA_DIR, fname)
        with open(path, "rb") as f:
            content = f.read()
        log(f"  {fname}: md5={hashlib.md5(content).hexdigest()} len={len(content)}")

    import psycopg2
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = False
    cur = conn.cursor()

    # ---------------------------------------------------------------
    # 2. Schema
    # ---------------------------------------------------------------
    with open(os.path.join(DATA_DIR, "schema.sql")) as f:
        cur.execute(f.read())
    conn.commit()
    log("schema applied")

    cur.execute("SET search_path TO market_intel, public")

    # ---------------------------------------------------------------
    # 3. country (small hardcoded reference list: EU27 + UK + EEA)
    # ---------------------------------------------------------------
    COUNTRIES = [
        ("AT","AUT","Austria",True,True), ("BE","BEL","Belgium",True,True), ("BG","BGR","Bulgaria",True,True),
        ("HR","HRV","Croatia",True,True), ("CY","CYP","Cyprus",True,True), ("CZ","CZE","Czechia",True,True),
        ("DK","DNK","Denmark",True,True), ("EE","EST","Estonia",True,True), ("FI","FIN","Finland",True,True),
        ("FR","FRA","France",True,True), ("DE","DEU","Germany",True,True), ("GR","GRC","Greece",True,True),
        ("HU","HUN","Hungary",True,True), ("IE","IRL","Ireland",True,True), ("IT","ITA","Italy",True,True),
        ("LV","LVA","Latvia",True,True), ("LT","LTU","Lithuania",True,True), ("LU","LUX","Luxembourg",True,True),
        ("MT","MLT","Malta",True,True), ("NL","NLD","Netherlands",True,True), ("PL","POL","Poland",True,True),
        ("PT","PRT","Portugal",True,True), ("RO","ROU","Romania",True,True), ("SK","SVK","Slovakia",True,True),
        ("SI","SVN","Slovenia",True,True), ("ES","ESP","Spain",True,True), ("SE","SWE","Sweden",True,True),
        ("GB","GBR","United Kingdom",False,False), ("NO","NOR","Norway",False,True),
        ("IS","ISL","Iceland",False,True), ("LI","LIE","Liechtenstein",False,True),
    ]
    for iso2, iso3, name, is_eu, is_eea in COUNTRIES:
        cur.execute(
            "INSERT INTO country (iso2,iso3,name,is_eu,is_eea) VALUES (%s,%s,%s,%s,%s) "
            "ON CONFLICT (iso2) DO NOTHING", (iso2, iso3, name, is_eu, is_eea))
    conn.commit()
    cur.execute("SELECT iso2, id FROM country")
    country_id = dict(cur.fetchall())
    log(f"country: {len(country_id)} rows")

    # ---------------------------------------------------------------
    # 4. market_category
    # ---------------------------------------------------------------
    mcat_id = {}
    with open(os.path.join(DATA_DIR, "market_category.csv")) as f:
        for row in csv.DictReader(f):
            cur.execute(
                "INSERT INTO market_category (name, market_share_pct, notes) VALUES (%s,%s,%s) "
                "ON CONFLICT (name) DO UPDATE SET market_share_pct=EXCLUDED.market_share_pct RETURNING id",
                (row["name"], row["market_share_pct"] or None, row["notes"]))
            mcat_id[row["name"]] = cur.fetchone()[0]
    conn.commit()
    log(f"market_category: {len(mcat_id)} rows")

    # ---------------------------------------------------------------
    # 5. system_category
    # ---------------------------------------------------------------
    sc_count = 0
    with open(os.path.join(DATA_DIR, "system_category.csv")) as f:
        for row in csv.DictReader(f):
            mc = mcat_id.get(row["market_category"]) if row["market_category"] else None
            cur.execute(
                "INSERT INTO system_category (name, category_group, scope, definition, alt_definition, market_category_id) "
                "VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT (name, category_group) DO NOTHING",
                (row["name"], row["category_group"], row["scope"], row["definition"] or None,
                 row["alt_definition"] or None, mc))
            sc_count += 1
    conn.commit()
    log(f"system_category: {sc_count} rows")

    # ---------------------------------------------------------------
    # 6. supplier (preserve original ids from the FHI Supplier table)
    #    NOTE: this seed uses supplier_slim.csv (no description column) --
    #    the free-text description field is backfilled separately.
    # ---------------------------------------------------------------
    sup_count = 0
    max_id = 0
    with open(os.path.join(DATA_DIR, "supplier_slim.csv")) as f:
        for row in csv.DictReader(f):
            rid = int(row["id"])
            max_id = max(max_id, rid)
            created = row["source_created"] or None
            cur.execute(
                "INSERT INTO supplier (id, supplier_ext_id, name, logo_url, url, load_id, source_created) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (id) DO NOTHING",
                (rid, row["supplier_ext_id"] or None, row["name"], row["logo_url"] or None,
                 row["url"] or None, row["load_id"] or None, created))
            sup_count += 1
    cur.execute("SELECT setval(pg_get_serial_sequence('supplier','id'), %s)", (max_id,))
    conn.commit()
    log(f"supplier: {sup_count} rows (id sequence advanced to {max_id})")

    cur.execute("SELECT lower(name), id FROM supplier")
    supplier_id_by_name = dict(cur.fetchall())

    # ---------------------------------------------------------------
    # 7. supplier_revenue (each row cites its own source)
    # ---------------------------------------------------------------
    sr_count, sr_skipped = 0, 0
    with open(os.path.join(DATA_DIR, "supplier_revenue.csv")) as f:
        for row in csv.DictReader(f):
            sid = supplier_id_by_name.get(row["supplier_name"].lower())
            if not sid:
                sr_skipped += 1
                continue
            cur.execute(
                "INSERT INTO source (tier, publisher, notes, date_accessed) VALUES (%s,%s,%s, CURRENT_DATE) RETURNING id",
                (int(row["source_tier"]), row["source_publisher"], row["notes"] or None))
            src_id = cur.fetchone()[0]
            cur.execute(
                "INSERT INTO supplier_revenue (supplier_id, fiscal_year, geography, segment, revenue, currency, source_id, notes) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                (sid, row["fiscal_year"], row["geography"], row["segment"],
                 row["revenue"] or None, row["currency"], src_id, row["notes"] or None))
            sr_count += 1
    conn.commit()
    log(f"supplier_revenue: {sr_count} rows ({sr_skipped} skipped - no supplier match)")

    # ---------------------------------------------------------------
    # 8. market_size_estimate
    # ---------------------------------------------------------------
    mse_count, mse_skipped = 0, 0
    with open(os.path.join(DATA_DIR, "market_size_estimate.csv")) as f:
        for row in csv.DictReader(f):
            cid = country_id.get(row["country_iso2"])
            mc = mcat_id.get(row["market_category"])
            if not cid or not mc:
                mse_skipped += 1
                continue
            cur.execute(
                "INSERT INTO market_size_estimate (country_id, market_category_id, year, spend_route, value, currency, "
                "basis, methodology, confidence, notes) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) "
                "ON CONFLICT (country_id, market_category_id, year, spend_route, basis, methodology) DO NOTHING",
                (cid, mc, int(row["year"]), row["spend_route"], row["value"], row["currency"],
                 row["basis"], row["methodology"], row["confidence"], row["notes"]))
            mse_count += 1
    conn.commit()
    log(f"market_size_estimate: {mse_count} rows ({mse_skipped} skipped)")

    # ---------------------------------------------------------------
    # 9. national_programme (all tied to GB / NHS England for this seed)
    # ---------------------------------------------------------------
    np_count = 0
    gb_id = country_id["GB"]
    with open(os.path.join(DATA_DIR, "national_programme.csv")) as f:
        for row in csv.DictReader(f):
            cur.execute(
                "INSERT INTO national_programme (country_id, name, programme_year, revenue_value, capital_value, currency, notes) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (gb_id, row["name"], int(row["year"]), row["revenue_value"] or None,
                 row["capital_value"] or None, "GBP", row["notes"]))
            np_count += 1
    conn.commit()
    log(f"national_programme: {np_count} rows")

    # ---------------------------------------------------------------
    # 10. Verification
    # ---------------------------------------------------------------
    cur.execute("SELECT t, n FROM v_row_counts ORDER BY t")
    log("=== ROW COUNTS ===")
    for t, n in cur.fetchall():
        log(f"{t}: {n}")

    cur.close()
    conn.close()
    log("=== MIGRATION COMPLETE ===")
    return "\n".join(output)


if __name__ == "__main__":
    run()
