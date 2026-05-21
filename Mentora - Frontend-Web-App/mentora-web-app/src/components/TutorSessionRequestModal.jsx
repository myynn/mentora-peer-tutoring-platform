
import { useEffect, useState } from "react";
import Modal from "./Modal";
import { sessionsApi } from "../api/sessions";
import { availabilitySlotsApi } from "../api/availabilitySlots";
import "../styles/sessionModals.css";

const TutorSessionRequestModal = ({ open, onClose, session, tuteeName, onSaved }) => {

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  const handleConfirm = async () => {
    if (!session?.id) return;

    try {
      setSaving(true);
      setError("");

      const now = new Date().toISOString();
      const payload = {
        status: "confirmed",
        cancelledBy: null,
        updatedAt: now,
      };

      const res = await sessionsApi.update(session.id, payload);

      onSaved?.(res.data);
      window.alert("Session request confirmed!");
      onClose();
    } catch (e) {
      setError(e.message || "Failed to confirm session request.");
    } finally {
      setSaving(false);
    }
  };

  const handleDecline = async () => {
    if (!session?.id) return;

    try {
      setSaving(true);
      setError("");

      const now = new Date().toISOString();
      const payload = {
        status: "declined",
        cancelledBy: null,
        updatedAt: now,
      };

      const res = await sessionsApi.update(session.id, payload);

      await unlockSlotForSession(session, now);

      onSaved?.(res.data);
      window.alert("Session request declined. Slot released.");
      onClose();
    } catch (e) {
      setError(e.message || "Failed to decline session request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Tutee session request" open={open} onClose={onClose} cardClassName="modalSmall">
      <div className="mBody mCenter">
        <div className="mPill">
          Your tutee: <br />
          <strong>{tuteeName || "Tutee"}</strong>
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
            onClick={handleDecline}
            disabled={saving}
          >
            Decline
          </button>

          <button
            type="button"
            className="setBtnDanger"
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TutorSessionRequestModal;