"use server";

import { query } from "./db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { str, num, int, bool, csvArray } from "./formutil";

// ---------------------------------------------------------------------
// source
// ---------------------------------------------------------------------

export async function createSource(formData: FormData) {
  const tier = int(formData, "tier");
  if (tier === null) throw new Error("Evidence tier is required");
  await query(
    `INSERT INTO source (url, tier, publisher, title, date_accessed, notes)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      str(formData, "url"),
      tier,
      str(formData, "publisher"),
      str(formData, "title"),
      str(formData, "date_accessed"),
      str(formData, "notes"),
    ]
  );
  revalidatePath("/admin/sources");
  redirect("/admin/sources");
}

export async function updateSource(id: number, formData: FormData) {
  const tier = int(formData, "tier");
  if (tier === null) throw new Error("Evidence tier is required");
  await query(
    `UPDATE source SET url=$1, tier=$2, publisher=$3, title=$4, date_accessed=$5, notes=$6 WHERE id=$7`,
    [
      str(formData, "url"),
      tier,
      str(formData, "publisher"),
      str(formData, "title"),
      str(formData, "date_accessed"),
      str(formData, "notes"),
      id,
    ]
  );
  revalidatePath("/admin/sources");
  redirect("/admin/sources");
}

export async function deleteSource(id: number) {
  await query(`DELETE FROM source WHERE id=$1`, [id]);
  revalidatePath("/admin/sources");
  redirect("/admin/sources");
}

// ---------------------------------------------------------------------
// health_authority
// ---------------------------------------------------------------------

export async function createHealthAuthority(formData: FormData) {
  const country_id = int(formData, "country_id");
  const name = str(formData, "name");
  if (country_id === null || !name) throw new Error("Country and name are required");
  await query(
    `INSERT INTO health_authority (country_id, name, level, description, source_id)
     VALUES ($1,$2,$3,$4,$5)`,
    [country_id, name, str(formData, "level"), str(formData, "description"), int(formData, "source_id")]
  );
  revalidatePath("/admin/health-authorities");
  redirect("/admin/health-authorities");
}

export async function updateHealthAuthority(id: number, formData: FormData) {
  const country_id = int(formData, "country_id");
  const name = str(formData, "name");
  if (country_id === null || !name) throw new Error("Country and name are required");
  await query(
    `UPDATE health_authority SET country_id=$1, name=$2, level=$3, description=$4, source_id=$5 WHERE id=$6`,
    [country_id, name, str(formData, "level"), str(formData, "description"), int(formData, "source_id"), id]
  );
  revalidatePath("/admin/health-authorities");
  redirect("/admin/health-authorities");
}

export async function deleteHealthAuthority(id: number) {
  await query(`DELETE FROM health_authority WHERE id=$1`, [id]);
  revalidatePath("/admin/health-authorities");
  redirect("/admin/health-authorities");
}

// ---------------------------------------------------------------------
// hospital_group
// ---------------------------------------------------------------------

export async function createHospitalGroup(formData: FormData) {
  const country_id = int(formData, "country_id");
  const name = str(formData, "name");
  if (country_id === null || !name) throw new Error("Country and name are required");
  await query(
    `INSERT INTO hospital_group (country_id, name, ownership_type, notes) VALUES ($1,$2,$3,$4)`,
    [country_id, name, str(formData, "ownership_type"), str(formData, "notes")]
  );
  revalidatePath("/admin/hospital-groups");
  redirect("/admin/hospital-groups");
}

export async function updateHospitalGroup(id: number, formData: FormData) {
  const country_id = int(formData, "country_id");
  const name = str(formData, "name");
  if (country_id === null || !name) throw new Error("Country and name are required");
  await query(
    `UPDATE hospital_group SET country_id=$1, name=$2, ownership_type=$3, notes=$4 WHERE id=$5`,
    [country_id, name, str(formData, "ownership_type"), str(formData, "notes"), id]
  );
  revalidatePath("/admin/hospital-groups");
  redirect("/admin/hospital-groups");
}

export async function deleteHospitalGroup(id: number) {
  await query(`DELETE FROM hospital_group WHERE id=$1`, [id]);
  revalidatePath("/admin/hospital-groups");
  redirect("/admin/hospital-groups");
}

// ---------------------------------------------------------------------
// hospital_site
// ---------------------------------------------------------------------

export async function createHospitalSite(formData: FormData) {
  const country_id = int(formData, "country_id");
  const name = str(formData, "name");
  if (country_id === null || !name) throw new Error("Country and name are required");
  await query(
    `INSERT INTO hospital_site
       (country_id, hospital_group_id, health_authority_id, name, city, beds, site_type, ownership_type, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      country_id,
      int(formData, "hospital_group_id"),
      int(formData, "health_authority_id"),
      name,
      str(formData, "city"),
      int(formData, "beds"),
      str(formData, "site_type"),
      str(formData, "ownership_type"),
      str(formData, "notes"),
    ]
  );
  revalidatePath("/admin/hospital-sites");
  redirect("/admin/hospital-sites");
}

export async function updateHospitalSite(id: number, formData: FormData) {
  const country_id = int(formData, "country_id");
  const name = str(formData, "name");
  if (country_id === null || !name) throw new Error("Country and name are required");
  await query(
    `UPDATE hospital_site SET
       country_id=$1, hospital_group_id=$2, health_authority_id=$3, name=$4,
       city=$5, beds=$6, site_type=$7, ownership_type=$8, notes=$9
     WHERE id=$10`,
    [
      country_id,
      int(formData, "hospital_group_id"),
      int(formData, "health_authority_id"),
      name,
      str(formData, "city"),
      int(formData, "beds"),
      str(formData, "site_type"),
      str(formData, "ownership_type"),
      str(formData, "notes"),
      id,
    ]
  );
  revalidatePath("/admin/hospital-sites");
  redirect("/admin/hospital-sites");
}

export async function deleteHospitalSite(id: number) {
  await query(`DELETE FROM hospital_site WHERE id=$1`, [id]);
  revalidatePath("/admin/hospital-sites");
  redirect("/admin/hospital-sites");
}

// ---------------------------------------------------------------------
// contact
// ---------------------------------------------------------------------

export async function createContact(formData: FormData) {
  const full_name = str(formData, "full_name");
  const role_title = str(formData, "role_title");
  const date_last_verified = str(formData, "date_last_verified");
  const hospital_site_id = int(formData, "hospital_site_id");
  const hospital_group_id = int(formData, "hospital_group_id");
  const health_authority_id = int(formData, "health_authority_id");
  if (!full_name || !role_title || !date_last_verified)
    throw new Error("Name, role title and date last verified are required");
  if (!hospital_site_id && !hospital_group_id && !health_authority_id)
    throw new Error("A contact needs a site, group, or health authority");
  await query(
    `INSERT INTO contact
       (hospital_site_id, hospital_group_id, health_authority_id, full_name, role_title,
        role_type, start_date, end_date, date_last_verified, source_id, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      hospital_site_id,
      hospital_group_id,
      health_authority_id,
      full_name,
      role_title,
      str(formData, "role_type"),
      str(formData, "start_date"),
      str(formData, "end_date"),
      date_last_verified,
      int(formData, "source_id"),
      str(formData, "notes"),
    ]
  );
  revalidatePath("/admin/contacts");
  redirect("/admin/contacts");
}

export async function updateContact(id: number, formData: FormData) {
  const full_name = str(formData, "full_name");
  const role_title = str(formData, "role_title");
  const date_last_verified = str(formData, "date_last_verified");
  const hospital_site_id = int(formData, "hospital_site_id");
  const hospital_group_id = int(formData, "hospital_group_id");
  const health_authority_id = int(formData, "health_authority_id");
  if (!full_name || !role_title || !date_last_verified)
    throw new Error("Name, role title and date last verified are required");
  if (!hospital_site_id && !hospital_group_id && !health_authority_id)
    throw new Error("A contact needs a site, group, or health authority");
  await query(
    `UPDATE contact SET
       hospital_site_id=$1, hospital_group_id=$2, health_authority_id=$3, full_name=$4,
       role_title=$5, role_type=$6, start_date=$7, end_date=$8, date_last_verified=$9,
       source_id=$10, notes=$11
     WHERE id=$12`,
    [
      hospital_site_id,
      hospital_group_id,
      health_authority_id,
      full_name,
      role_title,
      str(formData, "role_type"),
      str(formData, "start_date"),
      str(formData, "end_date"),
      date_last_verified,
      int(formData, "source_id"),
      str(formData, "notes"),
      id,
    ]
  );
  revalidatePath("/admin/contacts");
  redirect("/admin/contacts");
}

export async function deleteContact(id: number) {
  await query(`DELETE FROM contact WHERE id=$1`, [id]);
  revalidatePath("/admin/contacts");
  redirect("/admin/contacts");
}

// ---------------------------------------------------------------------
// procurement_notice
// ---------------------------------------------------------------------

export async function createProcurementNotice(formData: FormData) {
  const country_id = int(formData, "country_id");
  const status = str(formData, "status");
  if (country_id === null || !status) throw new Error("Country and status are required");
  await query(
    `INSERT INTO procurement_notice
       (country_id, hospital_group_id, hospital_site_id, health_authority_id, notice_id, portal,
        cpv_codes, title, publication_date, award_date, contract_start_date, contract_expiry_date,
        estimated_value, awarded_value, currency, awarded_supplier_id, is_framework, lot_description,
        status, source_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [
      country_id,
      int(formData, "hospital_group_id"),
      int(formData, "hospital_site_id"),
      int(formData, "health_authority_id"),
      str(formData, "notice_id"),
      str(formData, "portal"),
      csvArray(formData, "cpv_codes"),
      str(formData, "title"),
      str(formData, "publication_date"),
      str(formData, "award_date"),
      str(formData, "contract_start_date"),
      str(formData, "contract_expiry_date"),
      num(formData, "estimated_value"),
      num(formData, "awarded_value"),
      str(formData, "currency"),
      int(formData, "awarded_supplier_id"),
      bool(formData, "is_framework"),
      str(formData, "lot_description"),
      status,
      int(formData, "source_id"),
    ]
  );
  revalidatePath("/admin/procurement-notices");
  redirect("/admin/procurement-notices");
}

export async function updateProcurementNotice(id: number, formData: FormData) {
  const country_id = int(formData, "country_id");
  const status = str(formData, "status");
  if (country_id === null || !status) throw new Error("Country and status are required");
  await query(
    `UPDATE procurement_notice SET
       country_id=$1, hospital_group_id=$2, hospital_site_id=$3, health_authority_id=$4,
       notice_id=$5, portal=$6, cpv_codes=$7, title=$8, publication_date=$9, award_date=$10,
       contract_start_date=$11, contract_expiry_date=$12, estimated_value=$13, awarded_value=$14,
       currency=$15, awarded_supplier_id=$16, is_framework=$17, lot_description=$18, status=$19,
       source_id=$20
     WHERE id=$21`,
    [
      country_id,
      int(formData, "hospital_group_id"),
      int(formData, "hospital_site_id"),
      int(formData, "health_authority_id"),
      str(formData, "notice_id"),
      str(formData, "portal"),
      csvArray(formData, "cpv_codes"),
      str(formData, "title"),
      str(formData, "publication_date"),
      str(formData, "award_date"),
      str(formData, "contract_start_date"),
      str(formData, "contract_expiry_date"),
      num(formData, "estimated_value"),
      num(formData, "awarded_value"),
      str(formData, "currency"),
      int(formData, "awarded_supplier_id"),
      bool(formData, "is_framework"),
      str(formData, "lot_description"),
      status,
      int(formData, "source_id"),
      id,
    ]
  );
  revalidatePath("/admin/procurement-notices");
  redirect("/admin/procurement-notices");
}

export async function deleteProcurementNotice(id: number) {
  await query(`DELETE FROM procurement_notice WHERE id=$1`, [id]);
  revalidatePath("/admin/procurement-notices");
  redirect("/admin/procurement-notices");
}

// ---------------------------------------------------------------------
// product (no dedicated screen — upserted from the deployment form)
// ---------------------------------------------------------------------

async function findOrCreateProduct(
  supplier_id: number | null,
  name: string | null
): Promise<number | null> {
  if (!supplier_id || !name) return null;
  const existing = await query<{ id: number }>(
    `SELECT id FROM product WHERE supplier_id=$1 AND lower(name)=lower($2)`,
    [supplier_id, name]
  );
  if (existing.length) return existing[0].id;
  const created = await query<{ id: number }>(
    `INSERT INTO product (supplier_id, name) VALUES ($1,$2) RETURNING id`,
    [supplier_id, name]
  );
  return created[0].id;
}

// ---------------------------------------------------------------------
// deployment
// ---------------------------------------------------------------------

export async function createDeployment(formData: FormData) {
  const hospital_site_id = int(formData, "hospital_site_id");
  const hospital_group_id = int(formData, "hospital_group_id");
  if (!hospital_site_id && !hospital_group_id)
    throw new Error("A deployment needs a hospital site or a hospital group");
  const supplier_id = int(formData, "supplier_id");
  const product_id = await findOrCreateProduct(supplier_id, str(formData, "product_name"));
  const rows = await query<{ id: number }>(
    `INSERT INTO deployment
       (hospital_site_id, hospital_group_id, supplier_id, product_id, contract_value, currency,
        install_date, expiry_date, procurement_framework, status, evidence_tier, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`,
    [
      hospital_site_id,
      hospital_group_id,
      supplier_id,
      product_id,
      num(formData, "contract_value"),
      str(formData, "currency"),
      str(formData, "install_date"),
      str(formData, "expiry_date"),
      str(formData, "procurement_framework"),
      str(formData, "status") ?? "unconfirmed",
      int(formData, "evidence_tier"),
      str(formData, "notes"),
    ]
  );
  revalidatePath("/admin/deployments");
  redirect(`/admin/deployments/${rows[0].id}`);
}

export async function updateDeployment(id: number, formData: FormData) {
  const hospital_site_id = int(formData, "hospital_site_id");
  const hospital_group_id = int(formData, "hospital_group_id");
  if (!hospital_site_id && !hospital_group_id)
    throw new Error("A deployment needs a hospital site or a hospital group");
  const supplier_id = int(formData, "supplier_id");
  const product_id = await findOrCreateProduct(supplier_id, str(formData, "product_name"));
  await query(
    `UPDATE deployment SET
       hospital_site_id=$1, hospital_group_id=$2, supplier_id=$3, product_id=$4,
       contract_value=$5, currency=$6, install_date=$7, expiry_date=$8,
       procurement_framework=$9, status=$10, evidence_tier=$11, notes=$12
     WHERE id=$13`,
    [
      hospital_site_id,
      hospital_group_id,
      supplier_id,
      product_id,
      num(formData, "contract_value"),
      str(formData, "currency"),
      str(formData, "install_date"),
      str(formData, "expiry_date"),
      str(formData, "procurement_framework"),
      str(formData, "status") ?? "unconfirmed",
      int(formData, "evidence_tier"),
      str(formData, "notes"),
      id,
    ]
  );
  revalidatePath(`/admin/deployments/${id}`);
  redirect(`/admin/deployments/${id}`);
}

export async function deleteDeployment(id: number) {
  await query(`DELETE FROM deployment WHERE id=$1`, [id]);
  revalidatePath("/admin/deployments");
  redirect("/admin/deployments");
}

// ---------------------------------------------------------------------
// deployment_category (nested under a deployment's detail page)
// ---------------------------------------------------------------------

export async function createDeploymentCategory(deploymentId: number, formData: FormData) {
  const system_category_id = int(formData, "system_category_id");
  const coverage_status = str(formData, "coverage_status");
  if (system_category_id === null || !coverage_status)
    throw new Error("System category and coverage status are required");
  await query(
    `INSERT INTO deployment_category (deployment_id, system_category_id, coverage_status, evidence_tier, notes)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      deploymentId,
      system_category_id,
      coverage_status,
      int(formData, "evidence_tier"),
      str(formData, "notes"),
    ]
  );
  revalidatePath(`/admin/deployments/${deploymentId}`);
  redirect(`/admin/deployments/${deploymentId}`);
}

export async function updateDeploymentCategory(
  deploymentId: number,
  rowId: number,
  formData: FormData
) {
  const system_category_id = int(formData, "system_category_id");
  const coverage_status = str(formData, "coverage_status");
  if (system_category_id === null || !coverage_status)
    throw new Error("System category and coverage status are required");
  await query(
    `UPDATE deployment_category SET system_category_id=$1, coverage_status=$2, evidence_tier=$3, notes=$4
     WHERE id=$5 AND deployment_id=$6`,
    [
      system_category_id,
      coverage_status,
      int(formData, "evidence_tier"),
      str(formData, "notes"),
      rowId,
      deploymentId,
    ]
  );
  revalidatePath(`/admin/deployments/${deploymentId}`);
  redirect(`/admin/deployments/${deploymentId}`);
}

export async function deleteDeploymentCategory(deploymentId: number, rowId: number) {
  await query(`DELETE FROM deployment_category WHERE id=$1 AND deployment_id=$2`, [
    rowId,
    deploymentId,
  ]);
  revalidatePath(`/admin/deployments/${deploymentId}`);
  redirect(`/admin/deployments/${deploymentId}`);
}
