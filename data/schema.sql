-- =====================================================================
-- European Health IT Market Intelligence Database
-- Phase 1 schema — see claude/build-strategy.md and the published
-- blueprint (https://claude.ai/code/artifact/cbe28419-590f-4796-8df9-2e7be5760d4d)
-- for the full design rationale. This file is idempotent (safe to re-run).
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS market_intel;
SET search_path TO market_intel, public;

-- ---------------------------------------------------------------------
-- Reference / geography
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS country (
    id          SERIAL PRIMARY KEY,
    iso2        CHAR(2) NOT NULL UNIQUE,
    iso3        CHAR(3) UNIQUE,
    name        TEXT NOT NULL,
    is_eu       BOOLEAN NOT NULL DEFAULT TRUE,
    is_eea      BOOLEAN NOT NULL DEFAULT TRUE,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source (
    id             SERIAL PRIMARY KEY,
    url            TEXT,
    tier           SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 7),
    publisher      TEXT,
    title          TEXT,
    date_accessed  DATE,
    notes          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE source IS 'Evidence tiers: 1 ministry/gov, 2 procurement notices, 3 national eHealth agency, 4 trade press, 5 hospital/group own pages, 6 supplier PR/Wikipedia, 7 unsourced (never asserted).';

CREATE TABLE IF NOT EXISTS health_authority (
    id          SERIAL PRIMARY KEY,
    country_id  INTEGER NOT NULL REFERENCES country(id),
    name        TEXT NOT NULL,
    level       TEXT CHECK (level IN ('national','regional','local')),
    description TEXT,
    source_id   INTEGER REFERENCES source(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (country_id, name)
);

CREATE TABLE IF NOT EXISTS hospital_group (
    id             SERIAL PRIMARY KEY,
    country_id     INTEGER NOT NULL REFERENCES country(id),
    name           TEXT NOT NULL,
    ownership_type TEXT CHECK (ownership_type IN ('public','private','mixed')),
    notes          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (country_id, name)
);

CREATE TABLE IF NOT EXISTS hospital_site (
    id                  SERIAL PRIMARY KEY,
    country_id          INTEGER NOT NULL REFERENCES country(id),
    hospital_group_id   INTEGER REFERENCES hospital_group(id),
    health_authority_id INTEGER REFERENCES health_authority(id),
    name                TEXT NOT NULL,
    city                TEXT,
    beds                INTEGER,
    site_type           TEXT,
    ownership_type      TEXT CHECK (ownership_type IN ('public','private','mixed')),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hospital_site_country ON hospital_site(country_id);
CREATE INDEX IF NOT EXISTS idx_hospital_site_group ON hospital_site(hospital_group_id);

-- ---------------------------------------------------------------------
-- Suppliers, products, taxonomy
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS supplier (
    id              SERIAL PRIMARY KEY,
    supplier_ext_id TEXT,                 -- original Supplier_ID from the FHI WordPress table
    name            TEXT NOT NULL,
    logo_url        TEXT,
    description     TEXT,
    url             TEXT,
    load_id         TEXT,
    source_created  DATE,                 -- original Created_Date from the migrated table
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_name_ci ON supplier (lower(name));
COMMENT ON TABLE supplier IS 'Vendor master, migrated directly from the existing FHI Supplier table (1,645+ rows).';

CREATE TABLE IF NOT EXISTS product (
    id          SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES supplier(id),
    name        TEXT NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (supplier_id, name)
);

CREATE TABLE IF NOT EXISTS market_category (
    id               SERIAL PRIMARY KEY,
    name             TEXT NOT NULL UNIQUE,
    market_share_pct NUMERIC(6,3),   -- from the FHI Market Model Overview sheet, NHS baseline
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE market_category IS 'The ~16 broad top-down spend categories from the FHI Market Model (Overview sheet).';

CREATE TABLE IF NOT EXISTS system_category (
    id                SERIAL PRIMARY KEY,
    name              TEXT NOT NULL,
    category_group    TEXT NOT NULL CHECK (category_group IN ('clinical_business','infrastructure')),
    scope             TEXT NOT NULL CHECK (scope IN ('core','extended')),
    definition        TEXT,
    alt_definition    TEXT,
    market_category_id INTEGER REFERENCES market_category(id),  -- rollup mapping, section 02 of the blueprint
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (name, category_group)
);
CREATE INDEX IF NOT EXISTS idx_system_category_scope ON system_category(scope);
COMMENT ON TABLE system_category IS '82 clinical/business + 18 infrastructure categories from Clinical system data.xlsx / FHI Infrastructure Categories.xlsx, each flagged core or extended, rolling up many-to-one onto market_category.';

-- ---------------------------------------------------------------------
-- Deployments (commercial engagement) and category coverage (junction)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS deployment (
    id                    SERIAL PRIMARY KEY,
    hospital_site_id      INTEGER REFERENCES hospital_site(id),
    hospital_group_id     INTEGER REFERENCES hospital_group(id),
    supplier_id           INTEGER REFERENCES supplier(id),
    product_id            INTEGER REFERENCES product(id),
    contract_value        NUMERIC(14,2),
    currency              TEXT,
    install_date          DATE,
    expiry_date           DATE,
    procurement_framework TEXT,
    status                TEXT NOT NULL DEFAULT 'unconfirmed' CHECK (status IN ('confirmed','unconfirmed')),
    evidence_tier         SMALLINT CHECK (evidence_tier BETWEEN 1 AND 7),
    notes                 TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (hospital_site_id IS NOT NULL OR hospital_group_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_deployment_site ON deployment(hospital_site_id);
CREATE INDEX IF NOT EXISTS idx_deployment_group ON deployment(hospital_group_id);
CREATE INDEX IF NOT EXISTS idx_deployment_supplier ON deployment(supplier_id);
COMMENT ON TABLE deployment IS 'One row per contract/engagement, never per category — this is what dashboards must roll spend up by (never deployment_category) to avoid double-counting wall-to-wall EHR contracts.';

CREATE TABLE IF NOT EXISTS deployment_category (
    id                SERIAL PRIMARY KEY,
    deployment_id     INTEGER NOT NULL REFERENCES deployment(id) ON DELETE CASCADE,
    system_category_id INTEGER NOT NULL REFERENCES system_category(id),
    coverage_status   TEXT NOT NULL CHECK (coverage_status IN ('confirmed','assumed','carve_out','unconfirmed')),
    evidence_tier     SMALLINT CHECK (evidence_tier BETWEEN 1 AND 7),
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (deployment_id, system_category_id)
);
COMMENT ON TABLE deployment_category IS 'Junction: which system_category rows a deployment actually covers. Carries the "one system, many categories" reality of wall-to-wall EHRs (Epic/Cerner/MEDITECH).';

-- ---------------------------------------------------------------------
-- Procurement notices (primary spend/date evidence)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS procurement_notice (
    id                    SERIAL PRIMARY KEY,
    country_id            INTEGER NOT NULL REFERENCES country(id),
    hospital_group_id     INTEGER REFERENCES hospital_group(id),
    hospital_site_id      INTEGER REFERENCES hospital_site(id),
    health_authority_id   INTEGER REFERENCES health_authority(id),
    notice_id             TEXT,
    portal                TEXT,           -- e.g. 'TED', 'eTenders.gov.ie'
    cpv_codes             TEXT[],
    title                 TEXT,
    publication_date      DATE,
    award_date            DATE,
    contract_start_date   DATE,
    contract_expiry_date  DATE,
    estimated_value       NUMERIC(14,2),
    awarded_value         NUMERIC(14,2),
    currency              TEXT,
    awarded_supplier_id   INTEGER REFERENCES supplier(id),
    is_framework          BOOLEAN NOT NULL DEFAULT FALSE,
    lot_description       TEXT,
    status                TEXT NOT NULL CHECK (status IN ('published','awarded','expired')),
    source_id             INTEGER REFERENCES source(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notice_country ON procurement_notice(country_id);
CREATE INDEX IF NOT EXISTS idx_notice_status ON procurement_notice(status);
COMMENT ON TABLE procurement_notice IS 'The richest, highest-trust table in the schema — evidence tier 2. TED + national portal sweeps feed this before the deployment pass.';

-- ---------------------------------------------------------------------
-- Digital leadership contacts
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS contact (
    id                   SERIAL PRIMARY KEY,
    hospital_site_id     INTEGER REFERENCES hospital_site(id),
    hospital_group_id    INTEGER REFERENCES hospital_group(id),
    health_authority_id  INTEGER REFERENCES health_authority(id),
    full_name            TEXT NOT NULL,
    role_title            TEXT NOT NULL,       -- as stated, verbatim
    role_type             TEXT CHECK (role_type IN ('CCIO','CMIO','CNIO','CIO','CXIO','CDIO','other')),
    start_date            DATE,
    end_date              DATE,
    date_last_verified    DATE NOT NULL,
    source_id             INTEGER REFERENCES source(id),
    notes                 TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (hospital_site_id IS NOT NULL OR hospital_group_id IS NOT NULL OR health_authority_id IS NOT NULL)
);
COMMENT ON TABLE contact IS 'Named digital leadership (CCIO/CMIO/CNIO/CIO/CXIO/CDIO). Re-verify twice yearly — date_last_verified drives the review cadence.';

-- Generic polymorphic citation join, since a fact can cite more than one source
CREATE TABLE IF NOT EXISTS fact_source (
    id          SERIAL PRIMARY KEY,
    source_id   INTEGER NOT NULL REFERENCES source(id),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('deployment','deployment_category','procurement_notice','contact')),
    entity_id   INTEGER NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_fact_source_entity ON fact_source(entity_type, entity_id);

-- ---------------------------------------------------------------------
-- Market sizing (top-down layer — section 02 of the blueprint)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS market_size_estimate (
    id                 SERIAL PRIMARY KEY,
    country_id         INTEGER NOT NULL REFERENCES country(id),
    market_category_id INTEGER NOT NULL REFERENCES market_category(id),
    year               INTEGER NOT NULL,
    spend_route        TEXT NOT NULL CHECK (spend_route IN ('local','national_programme')),
    value              NUMERIC(14,2) NOT NULL,
    currency            TEXT NOT NULL DEFAULT 'GBP',
    basis               TEXT CHECK (basis IN ('revenue','capital')),
    methodology         TEXT NOT NULL CHECK (methodology IN ('top_down','bottom_up','blended')),
    source_id           INTEGER REFERENCES source(id),
    confidence           TEXT CHECK (confidence IN ('high','medium','low')),
    notes                TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (country_id, market_category_id, year, spend_route, basis, methodology)
);
CREATE INDEX IF NOT EXISTS idx_mse_country_year ON market_size_estimate(country_id, year);
COMMENT ON TABLE market_size_estimate IS 'Top-down spend estimate, seeded from the FHI Market Model (NHS baseline) and to be triangulated against summed deployment values via the system_category rollup.';

CREATE TABLE IF NOT EXISTS supplier_revenue (
    id           SERIAL PRIMARY KEY,
    supplier_id  INTEGER NOT NULL REFERENCES supplier(id),
    fiscal_year  TEXT NOT NULL,      -- as stated in filed accounts, e.g. 'FY2025' or a date range
    geography    TEXT NOT NULL DEFAULT 'UK',
    segment      TEXT,               -- e.g. 'UK Health', 'UK EPR'
    revenue      NUMERIC(14,2),
    currency     TEXT NOT NULL DEFAULT 'GBP',
    source_id    INTEGER REFERENCES source(id),
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_revenue_supplier ON supplier_revenue(supplier_id);
COMMENT ON TABLE supplier_revenue IS 'Seeded from the FHI Market Model Supplier Revenues sheet, cross-checked against filed company accounts (e.g. Companies House).';

CREATE TABLE IF NOT EXISTS national_programme (
    id                  SERIAL PRIMARY KEY,
    health_authority_id INTEGER REFERENCES health_authority(id),
    country_id          INTEGER NOT NULL REFERENCES country(id),
    name                TEXT NOT NULL,
    programme_year      INTEGER NOT NULL,
    revenue_value       NUMERIC(14,2),
    capital_value       NUMERIC(14,2),
    currency            TEXT NOT NULL DEFAULT 'GBP',
    source_id           INTEGER REFERENCES source(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE national_programme IS 'Major country-level digital health programmes, year-by-year revenue/capital spend plans.';

-- ---------------------------------------------------------------------
-- Verification helper (row counts) — used by the migration/verify step
-- ---------------------------------------------------------------------

CREATE OR REPLACE VIEW market_intel.v_row_counts AS
SELECT 'country' t, count(*) n FROM market_intel.country
UNION ALL SELECT 'health_authority', count(*) FROM market_intel.health_authority
UNION ALL SELECT 'hospital_group', count(*) FROM market_intel.hospital_group
UNION ALL SELECT 'hospital_site', count(*) FROM market_intel.hospital_site
UNION ALL SELECT 'supplier', count(*) FROM market_intel.supplier
UNION ALL SELECT 'product', count(*) FROM market_intel.product
UNION ALL SELECT 'system_category', count(*) FROM market_intel.system_category
UNION ALL SELECT 'deployment', count(*) FROM market_intel.deployment
UNION ALL SELECT 'deployment_category', count(*) FROM market_intel.deployment_category
UNION ALL SELECT 'procurement_notice', count(*) FROM market_intel.procurement_notice
UNION ALL SELECT 'contact', count(*) FROM market_intel.contact
UNION ALL SELECT 'source', count(*) FROM market_intel.source
UNION ALL SELECT 'market_category', count(*) FROM market_intel.market_category
UNION ALL SELECT 'market_size_estimate', count(*) FROM market_intel.market_size_estimate
UNION ALL SELECT 'supplier_revenue', count(*) FROM market_intel.supplier_revenue
UNION ALL SELECT 'national_programme', count(*) FROM market_intel.national_programme;
