// imports
import { useEffect, useState } from "react";
import Modal from "./Modal";
import { sessionsApi } from "../api/sessions";
import { availabilitySlotsApi } from "../api/availabilitySlots";
import statsApi from "../api/stats";
import "../styles/sessionModals.css";

const ConfirmAttendanceModal = ({ open, onClose, session, tutorName, onSaved }) => {
  // ui state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  //  reset when open
  useEffect(() => {
    if (!open) return;
    setSaving(false);
    setError("");
  }, [open]);

  // confirm attendance
  const handleConfirm = async () => {
    if (!session?.id) return;

    try {
      setSaving(true);
      setError("");

      const now = new Date().toISOString();

      const payload = {
        tuteeConfirmedAttendance: true,
        updatedAt: now,
      };

      const res = await sessionsApi.update(session.id, payload);

      await statsApi.recomputeTuteeStats(res.data.tuteeId);

      if (String(res.data.status || "").toLowerCase() === "completed") {
        await statsApi.recomputeTutorStats(res.data.tutorId);
      }

      onSaved?.(res.data);
      window.alert("Attendance confirmed successfully!");
      onClose();
    } catch (e) {
      setError(e.message || "Failed to confirm attendance.");
    } finally {
      setSaving(false);
    }
  };

  //  unable to attend 
  const handleUnable = async () => {
    if (!session?.id) return;

    try {
      setSaving(true);
      setError("");

      const now = new Date().toISOString();

      const payload = {
        status: "cancelled",
        cancelledBy: "tutee",
        updatedAt: now,
      };

      const res = await sessionsApi.update(session.id, payload);

      await statsApi.recomputeTuteeStats(res.data.tuteeId);

      onSaved?.(res.data);
      window.alert("Session cancelled. The slot has been released.");
      onClose();
    } catch (e) {
      setError(e.message || "Failed to cancel session.");
    } finally {
      setSaving(false);
    }
  };

  // render 
  return (
    <Modal title="Confirm attendance" open={open} onClose={onClose}>
      <div className="mBody mCenter">
        <div className="mPill">
          Your session is at <br />
          <strong>{session?.sessionTimeRange || "-"}</strong>
        </div>

        <div className="mLine">
          <span className="mMuted">Your tutor:</span>{" "}
          <strong>{tutorName || "Tutor"}</strong>
        </div>

        <div className="mText">
          Please confirm your attendance for this session.
          <div className="mTiny">
            If you miss 3 sessions without prior cancellation, you may receive a
            warning to ensure fairness to our tutors.
          </div>
        </div>

        {error ? <div className="mError">{error}</div> : null}

        <div className="mFooter mFooterSplit">
          <button
            type="button"
            className="setBtnGhost"
            onClick={handleUnable}
            disabled={saving}
          >
            Unable to attend
          </button>

          <button
            type="button"
            className="setBtnDanger"
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? "Saving..." : "Confirm attendance"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmAttendanceModal;