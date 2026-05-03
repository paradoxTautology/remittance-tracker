/**
 * ERA/EOB Reason Code Reference
 *
 * Sources: X12 CARC/RARC standard code sets, CMS guidelines.
 * Each entry has: description, category, and actionable fix steps.
 */

const REASON_CODES = {
  // --- CO (Contractual Obligations) ---
  "CO-4": {
    code: "CO-4",
    group: "CO",
    description: "The procedure code is inconsistent with the modifier used, or a required modifier is missing.",
    category: "Coding Error",
    fix: "Review the CPT code and modifiers submitted. Verify correct modifier usage per payer guidelines. Resubmit with the correct modifier if applicable.",
  },
  "CO-11": {
    code: "CO-11",
    group: "CO",
    description: "The diagnosis is inconsistent with the procedure.",
    category: "Coding Error",
    fix: "Check the ICD-10 code against the CPT code. Ensure medical necessity is supported. Correct the diagnosis and resubmit if there was an error, or submit records to support medical necessity.",
  },
  "CO-16": {
    code: "CO-16",
    group: "CO",
    description: "Claim/service lacks information or has submission/billing error(s) needed for adjudication.",
    category: "Missing Information",
    fix: "Check the accompanying remark code for specifics on what's missing. Common issues: missing prior auth, referring provider, or prior payer EOB. Correct and resubmit.",
  },
  "CO-18": {
    code: "CO-18",
    group: "CO",
    description: "Exact duplicate claim/service.",
    category: "Duplicate",
    fix: "This claim was already processed. Check your records for the original payment. If you believe this is not a duplicate, submit a corrected claim with documentation showing why it's a separate service.",
  },
  "CO-22": {
    code: "CO-22",
    group: "CO",
    description: "This care may be covered by another payer per coordination of benefits.",
    category: "Coordination of Benefits",
    fix: "Verify the patient's primary insurance and submit the claim to the correct primary payer first. Once the primary EOB is received, submit to this payer as secondary with the primary EOB attached.",
  },
  "CO-24": {
    code: "CO-24",
    group: "CO",
    description: "Charges are covered under a capitation agreement/managed care plan.",
    category: "Capitation",
    fix: "Verify if the patient is part of a capitated plan. If so, payment is included in your capitation rate. If the patient has since left the plan, provide documentation of disenrollment and resubmit.",
  },
  "CO-27": {
    code: "CO-27",
    group: "CO",
    description: "Expenses incurred after coverage terminated.",
    category: "Eligibility",
    fix: "Verify the patient's eligibility for the date of service. If coverage was active, submit proof of eligibility and appeal. If coverage truly ended, bill the patient or their new insurance.",
  },
  "CO-29": {
    code: "CO-29",
    group: "CO",
    description: "The time limit for filing has expired.",
    category: "Timely Filing",
    fix: "If you have proof of timely filing (original submission receipt, clearinghouse confirmation), submit an appeal with that documentation. Otherwise, this amount is a write-off — cannot bill the patient.",
  },
  "CO-31": {
    code: "CO-31",
    group: "CO",
    description: "Patient cannot be identified as our insured.",
    category: "Eligibility",
    fix: "Verify patient demographics and insurance information. Check for typos in member ID, name, or DOB. Correct and resubmit with accurate patient information.",
  },
  "CO-45": {
    code: "CO-45",
    group: "CO",
    description: "Charge exceeds fee schedule/maximum allowable or contracted/legislated fee arrangement.",
    category: "Contractual Adjustment",
    fix: "This is typically a standard contractual write-off — the difference between your billed charge and the payer's allowed amount. No action needed unless the allowed amount seems incorrect, in which case review your contract and appeal.",
  },
  "CO-50": {
    code: "CO-50",
    group: "CO",
    description: "These are non-covered services because this is not deemed a medical necessity by the payer.",
    category: "Medical Necessity",
    fix: "Review the diagnosis codes for medical necessity support. If appropriate, submit an appeal with clinical documentation, chart notes, and a letter of medical necessity.",
  },
  "CO-96": {
    code: "CO-96",
    group: "CO",
    description: "Non-covered charge(s). At least one Remark Code must be provided.",
    category: "Non-Covered",
    fix: "Check the remark code for specifics. May need prior authorization, different diagnosis code, or the service may not be a covered benefit. Review the patient's plan and consider an appeal with supporting documentation.",
  },
  "CO-97": {
    code: "CO-97",
    group: "CO",
    description: "The benefit for this service is included in the payment/allowance for another service/procedure that has already been adjudicated.",
    category: "Bundling",
    fix: "The service was bundled with another procedure. Review CCI edits. If services were truly separate and distinct, append modifier 59 or appropriate X modifier and resubmit with documentation.",
  },
  "CO-109": {
    code: "CO-109",
    group: "CO",
    description: "Claim/service not covered by this payer/contractor. You must send the claim/service to the correct payer/contractor.",
    category: "Wrong Payer",
    fix: "Verify the correct payer for this patient and resubmit to the appropriate insurance carrier.",
  },
  "CO-167": {
    code: "CO-167",
    group: "CO",
    description: "This (these) diagnosis(es) is (are) not covered.",
    category: "Non-Covered Diagnosis",
    fix: "Review diagnosis codes for accuracy. If the diagnosis is correct, the service may not be covered under this plan. Consider ABN if applicable, or appeal with medical necessity documentation.",
  },
  "CO-197": {
    code: "CO-197",
    group: "CO",
    description: "Precertification/authorization/notification absent.",
    category: "Authorization",
    fix: "Obtain retroactive authorization if the payer allows it. Submit appeal with auth number if one was obtained but not included on the claim. For future claims, verify auth requirements before service.",
  },
  "CO-242": {
    code: "CO-242",
    group: "CO",
    description: "Services not provided by network/primary care providers.",
    category: "Network",
    fix: "Verify your network status with this payer. If you are in-network, submit proof of participation and appeal. If out-of-network, the patient may have higher cost-sharing.",
  },
  "CO-252": {
    code: "CO-252",
    group: "CO",
    description: "An attachment/other documentation is required to adjudicate this claim/service.",
    category: "Missing Documentation",
    fix: "Submit the required documentation (medical records, operative notes, etc.) along with the claim reference number. Check the remark code for specifics on what's needed.",
  },
  "CO-253": {
    code: "CO-253",
    group: "CO",
    description: "Sequestration — reduction in federal payment.",
    category: "Sequestration",
    fix: "This is a mandatory 2% reduction on all Medicare fee-for-service claims due to federal sequestration. No action needed — this is not appealable. Cannot bill the patient for this amount.",
  },
  "CO-B9": {
    code: "CO-B9",
    group: "CO",
    description: "Patient is enrolled in a Hospice.",
    category: "Hospice",
    fix: "Verify hospice enrollment status. Services related to the hospice diagnosis should be billed to the hospice provider. Unrelated services may still be billable — resubmit with appropriate modifier (GW) if the service is unrelated to hospice.",
  },
  "CO-B11": {
    code: "CO-B11",
    group: "CO",
    description: "The claim/service has been transferred to the proper payer/processor for processing. Claim not covered by this payer.",
    category: "Misrouted / Transferred",
    fix: "The claim was sent to the wrong payer and has been forwarded. Check with the correct payer (e.g., WellMed, Humana) for payment status. If not received, resubmit directly to the correct plan.",
  },

  // --- PR (Patient Responsibility) ---
  "PR-1": {
    code: "PR-1",
    group: "PR",
    description: "Deductible amount.",
    category: "Patient Responsibility",
    fix: "This amount is the patient's deductible responsibility. Bill the patient for this amount. Verify the deductible was applied correctly by checking the EOB allowed amount.",
  },
  "PR-2": {
    code: "PR-2",
    group: "PR",
    description: "Coinsurance amount.",
    category: "Patient Responsibility",
    fix: "This is the patient's coinsurance portion. Bill the patient for this amount. For dual-eligible patients, submit to the secondary payer (e.g., Medicaid) before billing the patient.",
  },
  "PR-3": {
    code: "PR-3",
    group: "PR",
    description: "Co-payment amount.",
    category: "Patient Responsibility",
    fix: "Collect the copay from the patient. This should ideally be collected at time of service. If not collected, send a patient statement.",
  },
  "PR-24": {
    code: "PR-24",
    group: "PR",
    description: "Charges are covered under a capitation agreement/managed care plan.",
    category: "Capitation",
    fix: "This patient is part of a capitated arrangement — payment is included in your capitation rate. Do not bill the patient. Verify the patient's managed care enrollment if you believe this is incorrect.",
  },
  "PR-27": {
    code: "PR-27",
    group: "PR",
    description: "Expenses incurred after coverage terminated.",
    category: "Eligibility",
    fix: "Patient's coverage ended before the date of service. Bill the patient directly, or verify if they have new insurance. If you believe coverage was active, appeal with eligibility documentation.",
  },
  "PR-96": {
    code: "PR-96",
    group: "PR",
    description: "Non-covered charge(s).",
    category: "Non-Covered",
    fix: "If an ABN was obtained, the patient can be billed. If no ABN, this may be a provider write-off. Check the remark code for specifics on why the service wasn't covered.",
  },
  "PR-119": {
    code: "PR-119",
    group: "PR",
    description: "Benefit maximum for this time period or occurrence has been reached.",
    category: "Benefit Maximum",
    fix: "The patient has exhausted their benefit for this service type. Inform the patient. If you believe the limit was applied incorrectly, request a benefit verification and appeal.",
  },
  "PR-204": {
    code: "PR-204",
    group: "PR",
    description: "This service/equipment/drug is not covered under the patient's current benefit plan.",
    category: "Non-Covered",
    fix: "Verify the patient's benefit plan. If the service should be covered, appeal with plan documentation. If truly not covered and ABN was signed, bill the patient.",
  },

  // --- OA (Other Adjustments) ---
  "OA-18": {
    code: "OA-18",
    group: "OA",
    description: "Exact duplicate claim/service.",
    category: "Duplicate",
    fix: "This is a duplicate submission. Verify the original claim was paid. If this is a crossover claim, check with the secondary payer. If not a true duplicate, resubmit with documentation showing distinct services.",
  },
  "OA-23": {
    code: "OA-23",
    group: "OA",
    description: "The impact of prior payer(s) adjudication including payments and/or adjustments.",
    category: "Coordination of Benefits",
    fix: "This adjustment reflects what the primary payer already paid or adjusted. No action needed — verify the primary EOB was applied correctly.",
  },

  // --- PI (Payer Initiated) ---
  "PI-94": {
    code: "PI-94",
    group: "PI",
    description: "Processed in excess of charges.",
    category: "Overpayment",
    fix: "The payer overpaid on a previous claim and is recouping. Verify the recoupment is correct by reviewing the original claim. If incorrect, appeal the recoupment.",
  },
  "RTP": {
    code: "RTP",
    group: "RTP",
    description: "Return to Provider — claim rejected due to missing or invalid information. The member is not delegated to the payer on the date of service.",
    category: "Eligibility",
    fix: "Contact the health plan to verify member enrollment and delegation status on the DOS. If the member was delegated, submit proof of enrollment. If not, resubmit to the correct payer.",
  },
  "177": {
    code: "177",
    group: "CARC",
    description: "Patient has not met the required eligibility requirements.",
    category: "Eligibility",
    fix: "Verify patient eligibility for the date of service. Check if coverage was active and if prior authorization was required. If eligibility was valid, submit documentation to the payer with proof of coverage and appeal.",
  },
};

// --- Remark Codes (N-codes) ---
const REMARK_CODES = {
  N4: {
    code: "N4",
    description: "Missing/incomplete/invalid prior insurance carrier's EOB.",
    fix: "Submit the primary payer's EOB with the claim.",
  },
  N130: {
    code: "N130",
    description: "Consult plan benefit documents/guidelines for information about restrictions for this service.",
    fix: "Review the patient's plan benefits. Service may have frequency limits or require prior auth.",
  },
  N418: {
    code: "N418",
    description: "Misrouted claim. See the payer's claim submission instructions.",
    fix: "Resubmit the claim to the correct payer. Contact the insurance to verify the correct submission address/payer ID.",
  },
  N522: {
    code: "N522",
    description: "Duplicate of a claim processed, or to be processed, as a crossover claim.",
    fix: "No action needed — the claim will be or has been processed via automatic crossover. Check the crossover payer for payment.",
  },
  N598: {
    code: "N598",
    description: "Health care policy coverage is primary.",
    fix: "Submit to the primary health care policy first. This payer is secondary and needs the primary EOB.",
  },
  N781: {
    code: "N781",
    description: "No deductible may be collected as patient is a Medicaid/Qualified Medicare Beneficiary.",
    fix: "Do not collect deductible from this patient — they are QMB. Verify QMB status and bill Medicaid for any remaining balance.",
  },
};

/**
 * Look up a reason or remark code.
 * @param {string} code - e.g. "CO-45", "PR-1", "N418"
 * @returns {object|null}
 */
export function lookupCode(code) {
  const upper = (code || "").trim().toUpperCase();
  return REASON_CODES[upper] || REMARK_CODES[upper] || null;
}

/**
 * Get all known codes.
 */
export function getAllCodes() {
  return { ...REASON_CODES, ...REMARK_CODES };
}

/**
 * Category color mapping for UI.
 */
export const CATEGORY_COLORS = {
  "Contractual Adjustment": "#7a7060",
  "Sequestration": "#7a7060",
  "Patient Responsibility": "#c8aa64",
  "Coding Error": "#c0785a",
  "Missing Information": "#c2703e",
  "Missing Documentation": "#c2703e",
  "Duplicate": "#96a8c0",
  "Coordination of Benefits": "#a888b0",
  "Capitation": "#a888b0",
  "Eligibility": "#c0785a",
  "Timely Filing": "#c0785a",
  "Medical Necessity": "#c2703e",
  "Non-Covered": "#c0785a",
  "Non-Covered Diagnosis": "#c0785a",
  "Bundling": "#c2703e",
  "Authorization": "#c8aa64",
  "Network": "#96a8c0",
  "Hospice": "#7a7060",
  "Misrouted / Transferred": "#a888b0",
  "Wrong Payer": "#a888b0",
  "Benefit Maximum": "#c8aa64",
  "Overpayment": "#c0785a",
};

// --- WellMed / Payer-Specific Codes ---
// These appear on WellMed QuicRemit EOBs and map to standard ANSI equivalents

REASON_CODES["WM-301"] = {
  code: "WM-301",
  group: "WM",
  description: "Charges applied to deductible.",
  category: "Deductible",
  fix: "Patient owes this amount toward their annual deductible. Bill the patient directly. Equivalent to PR-1.",
};
REASON_CODES["WM-302"] = {
  code: "WM-302",
  group: "WM",
  description: "Copayment is member responsibility.",
  category: "Copay",
  fix: "Collect the copay amount from the patient. Equivalent to PR-3.",
};
REASON_CODES["WM-303"] = {
  code: "WM-303",
  group: "WM",
  description: "Coinsurance is member responsibility.",
  category: "Coinsurance",
  fix: "Bill the patient for their coinsurance portion. Equivalent to PR-2.",
};
REASON_CODES["WM-314"] = {
  code: "WM-314",
  group: "WM",
  description: "Sequestration reduction - CMS mandate per Budget Control Act 2011.",
  category: "Sequestration",
  fix: "Standard 2% Medicare sequestration reduction. No action needed — this is a mandatory federal adjustment. Equivalent to CO-253.",
};
REASON_CODES["WM-391"] = {
  code: "WM-391",
  group: "WM",
  description: "Payment is fee schedule based.",
  category: "Contractual Adjustment",
  fix: "Standard contractual write-off — difference between billed and allowed amount per your fee schedule agreement. No action needed unless the allowed amount seems wrong. Equivalent to CO-45.",
};
REASON_CODES["WM-852"] = {
  code: "WM-852",
  group: "WM",
  description: "Denied based on claims editing — possible duplicate procedure code on same date by same provider.",
  category: "Duplicate/Editing",
  fix: "WellMed flagged this as a potential duplicate. Check if a matching claim was already paid on another remittance. If not a duplicate, appeal with documentation showing services were distinct (different times, separate encounters).",
};


// --- Superior HealthPlan / OA codes ---
REASON_CODES["OA-23"] = {
  code: "OA-23",
  group: "OA",
  description: "The impact of prior payer(s) adjudication including payments and/or adjustments.",
  category: "Prior Payer",
  fix: "No action needed. This means Medicare or another primary payer already paid their portion. The current payer is paying the remainder. Verify the primary payer payment matches your records.",
};
REASON_CODES["92"] = {
  code: "92",
  group: "EX",
  description: "Paid in full.",
  category: "Payment",
  fix: "No action needed. Claim was paid in full per the fee schedule.",
};

REASON_CODES["us"] = {
  code: "us",
  group: "EX",
  description: "Payment in full for Medicare & Medicaid. Do not bill the patient.",
  category: "Payment",
  fix: "No action needed. Claim paid in full under Medicare/Medicaid. Patient cannot be balance billed.",
};
