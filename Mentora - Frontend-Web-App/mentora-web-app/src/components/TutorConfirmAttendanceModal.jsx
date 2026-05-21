// imports
import { useEffect, useState } from "react";
import Modal from "./Modal";
import { sessionsApi } from "../api/sessions";
import { availabilitySlotsApi } from "../api/availabilitySlots";
import statsApi from "../api/stats";
import "../styles/sessionModals.css";

const TutorConfirmAttendanceModal = ({ open, onClose, session, tuteeName, onSaved }) => {
  // ui state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  //reset when open
  useEffect(() => {
    if (!open) return;
    setSaving(false);
    setError("");
  }, [open]);

  const unlockSlotForSession = async (ses, nowIso) => {
    const slotRes = await availabilitySlotsApi.getBySessionId(ses.id);
    const slots = Array.isArray(slotRes.data) ? slotRes.data : [];

    let slot = slots.find((x) => String(x.sessionId) === String(ses.id)) || null;

    if (!slot) {
      const normTR = (v) => String(v || "").trim().replace(/\s+/g, " ");
      const byTutorRes = await availabilitySlotsApi.getByTutorId(ses.tutorId);
      const tutorSlots = Array.isArray(byTutorRes.data) ? byTutorRes.data : [];

      slot =
        tutorSlots.find((x) => {
          const sameDate =
            String(x.slotDate || "").slice(0, 10) === String(ses.sessionDate || ses.sessionDateTime || "").slice(0, 10);
          const sameTime = normTR(x.timeRange) === normTR(ses.sessionTimeRange);
          return sameDate && sameTime;
        }) || null;
    }

    if (slot?.id) {
      await availabilitySlotsApi.update(slot.id, {
        ...slot,
        isBooked: false,
        sessionId: null,
        updatedAt: nowIso,
      });
    }
  };

  //  tutor confirms attendance
  const handleConfirm = async () => {
    if (!session?.id) return;

    try {
      setSaving(true);
      setError("");

      const now = new Date().toISOString();

      const payload = {
        tutorConfirmedAttendance: true,
        status: "confirmed",
        updatedAt: now,
      };

      const res = await sessionsApi.update(session.id, payload);

      await statsApi.recomputeTutorStats(session.tutorId);
      await statsApi.recomputeTuteeStats(session.tuteeId);

      onSaved?.(res.data);
      window.alert("Attendance confirmed successfully!");
      onClose();
    } catch (e) {
      setError(e.message || "Failed to confirm attendance.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnable = async () => {
    if (!session?.id) return;

    try {
      setSaving(true);
      setError("");

      const now = new Date().toISOString();

      const payload = {
        status: "cancelled",
        cancelledBy: "tutor",
        updatedAt: now,
      };

      const res = await sessionsApi.update(session.id, payload);

      await unlockSlotForSession(session, now);

      await statsApi.recomputeTutorStats(session.tutorId);
      await statsApi.recomputeTuteeStats(session.tuteeId);

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
    <Modal title="Confirm attendance" open={open} onClose={onClose} cardClassName="modalSmall">
      <div className="mBody mCenter">
        <div className="mPill">
          Your session is at <br />
          <strong>{session?.sessionTimeRange || "-"}</strong>
        </div>

        <div className="mLine">
          <span className="mMuted">Your tutee:</span> <strong>{tuteeName || "Tutee"}</strong>
        </div>

        <div className="mText">
          <span className="mMuted">Lesson objectives:</span>
          <br />
          <strong>{session?.preSessionObjectives || "-"}</strong>
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

export default TutorConfirmAttendanceModal;
