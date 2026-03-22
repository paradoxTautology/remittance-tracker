import { useState } from "react";
import { formatDollar } from "../utils/format";

const ACTIONS = [
  { value: "appeal", label: "Appeal", desc: "Submitting formal appeal to payer" },
  { value: "resubmit", label: "Resubmit", desc: "Correcting and resubmitting claim" },
  { value: "email_payer", label: "Email Payer", desc: "Emailed insurance for info or resolution" },
  { value: "awaiting_info", label: "Awaiting Info", desc: "Waiting on response from payer or patient" },
  { value: "contact_payer", label: "Contact Payer", desc: "Calling/writing payer for resolution" },
  { value: "bill_patient", label: "Bill Patient", desc: "Sending patient statement" },
  { value: "submit_secondary", label: "Submit to Secondary", desc: "Filing with secondary insurance" },
  { value: "write_off", label: "Write Off", desc: "No further action — absorb cost" },
  { value: "other", label: "Other", desc: "Custom action" },
];

export default function WorkClaimModal({ claim, onSubmit, onClose }) {
  const [action, setAction] = useState("");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");

  const handleSubmit = () => {
    if (!action) return;
    onSubmit({
      claimId: claim._id,
      patient: claim.patient,
      dos: claim.dos,
      cpt: claim.cpt,
      payer: claim.payer,
      billed: claim.billed,
      reason_codes: claim.reason_codes,
      icn: claim.icn,
      acnt: claim.acnt,
      action,
      notes,
      followUpDate: followUp,
    });
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#221f1b",
          borderRadius: 14,
          padding: 28,
          width: 480,
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          border: "1px solid #342f28",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: "#e8dfd0" }}>
          Work Claim
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: "#7a7060" }}>
          Log the action you're taking on this denial
        </p>

        {/* Claim summary */}
        <div
          style={{
            padding: 12,
            background: "#2a2620",
            borderRadius: 8,
            marginBottom: 18,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
          }}
        >
          {[
            ["Patient", claim.patient],
            ["DOS", claim.dos],
            ["CPT", claim.cpt],
            ["Payer", claim.payer],
            ["Billed", formatDollar(parseFloat(claim.billed) || 0)],
            ["Reason", claim.reason_codes],
            ["Invoice #", (claim.acnt || "").replace(/^0+/, "")],
          ].map(([k, v]) =>
            v ? (
              <div key={k}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#7a7060", textTransform: "uppercase", letterSpacing: "0.5px" }}>{k}</div>
                <div style={{ fontSize: 12, color: "#e8dfd0", marginTop: 2 }}>{v}</div>
              </div>
            ) : null
          )}
        </div>

        {/* Action selection */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#bfb5a3", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>
            Action Taken
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {ACTIONS.map((a) => (
              <button
                key={a.value}
                onClick={() => setAction(a.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${action === a.value ? "#c2703e" : "#342f28"}`,
                  background: action === a.value ? "rgba(194,112,62,0.15)" : "#2a2620",
                  color: action === a.value ? "#c2703e" : "#bfb5a3",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>{a.label}</div>
                <div style={{ fontSize: 10, color: "#7a7060", marginTop: 2 }}>{a.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#bfb5a3", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>
            Notes
          </label>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                setNotes(notes ? notes + "\n" + e.target.value : e.target.value);
              }
            }}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #342f28",
              background: "#2a2620",
              color: "#bfb5a3",
              fontSize: 12,
              fontFamily: "inherit",
              marginBottom: 8,
            }}
          >
            <option value="">Quick note...</option>
            <optgroup label="Resubmissions">
              <option value="Resubmitted under Superior HealthCare">Resubmitted under Superior HealthCare</option>
              <option value="Resubmitted under UnitedHealthCare">Resubmitted under UnitedHealthCare</option>
              <option value="Resubmitted under BCBS of Texas">Resubmitted under BCBS of Texas</option>
              <option value="Resubmitted under Medicare">Resubmitted under Medicare</option>
              <option value="Resubmitted under Medicaid">Resubmitted under Medicaid</option>
              <option value="Resubmitted under WellMed">Resubmitted under WellMed</option>
            </optgroup>
            <optgroup label="Modifiers">
              <option value="Resubmitted with Modifier GV">Resubmitted with Modifier GV</option>
              <option value="Resubmitted with Modifier GW">Resubmitted with Modifier GW</option>
              <option value="Resubmitted with Modifier 25">Resubmitted with Modifier 25</option>
              <option value="Resubmitted with Modifier 59">Resubmitted with Modifier 59</option>
            </optgroup>
            <optgroup label="Coordination of Benefits">
              <option value="Submitted primary EOB to secondary payer">Submitted primary EOB to secondary payer</option>
              <option value="Awaiting primary EOB before resubmitting">Awaiting primary EOB before resubmitting</option>
              <option value="Corrected COB order and resubmitted">Corrected COB order and resubmitted</option>
            </optgroup>
            <optgroup label="Patient">
              <option value="Patient statement sent">Patient statement sent</option>
              <option value="Patient notified of balance due">Patient notified of balance due</option>
              <option value="Coverage terminated — billing patient directly">Coverage terminated — billing patient directly</option>
            </optgroup>
            <optgroup label="Payer Contact">
              <option value="Called payer — claim in review">Called payer — claim in review</option>
              <option value="Called payer — reprocessing requested">Called payer — reprocessing requested</option>
              <option value="Submitted appeal with medical records">Submitted appeal with medical records</option>
            </optgroup>
            <optgroup label="Email / Awaiting Response">
              <option value="Emailed payer requesting patient policy number">Emailed payer requesting patient policy number</option>
              <option value="Emailed payer requesting correct member ID">Emailed payer requesting correct member ID</option>
              <option value="Emailed payer requesting primary EOB">Emailed payer requesting primary EOB</option>
              <option value="Emailed payer requesting prior auth number">Emailed payer requesting prior auth number</option>
              <option value="Emailed payer requesting COB update">Emailed payer requesting COB update</option>
              <option value="Awaiting response from insurance — follow up in 7 days">Awaiting response — follow up in 7 days</option>
              <option value="Awaiting response from insurance — follow up in 14 days">Awaiting response — follow up in 14 days</option>
              <option value="Awaiting patient response — new insurance info needed">Awaiting patient — new insurance info needed</option>
            </optgroup>
            <optgroup label="Write-Off">
              <option value="Capitation — no action required">Capitation — no action required</option>
              <option value="Contractual adjustment — write off">Contractual adjustment — write off</option>
              <option value="Timely filing exceeded — write off">Timely filing exceeded — write off</option>
            </optgroup>
          </select>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you do? Reference numbers, who you spoke with, etc."
            rows={3}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #342f28",
              background: "#2a2620",
              color: "#e8dfd0",
              fontSize: 12,
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>

        {/* Follow-up date */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#bfb5a3", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>
            Follow-Up Date (optional)
          </label>
          <input
            type="date"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #342f28",
              background: "#2a2620",
              color: "#e8dfd0",
              fontSize: 12,
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 8,
              border: "1px solid #342f28",
              background: "transparent",
              color: "#bfb5a3",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!action}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 8,
              border: "none",
              background: action ? "#c2703e" : "#342f28",
              color: action ? "#fff" : "#7a7060",
              cursor: action ? "pointer" : "not-allowed",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            Log Work
          </button>
        </div>
      </div>
    </div>
  );
}
