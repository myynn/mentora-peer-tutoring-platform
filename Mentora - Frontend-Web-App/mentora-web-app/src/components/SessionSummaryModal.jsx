// imports
import { useEffect, useState } from "react";
import Modal from "./Modal";
import TextField from "./TextField";
import Button from "./Button";
import { sessionsApi } from "../api/sessions";
import "../styles/sessionModals.css";

const MAX_WORDS = {
  areasCovered: 60,
  nextLessonGoals: 40,
  postSessionFeedback: 60,
};

const countWords = (text) =>
  String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const SessionSummaryModal = ({ open, onClose, session, onSaved }) => {

  const [form, setForm] = useState({
    areasCovered: "",
    nextLessonGoals: "",
    postSessionFeedback: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!open) return;

    setError("");
    setSaving(false);

    setSubmitted(false);
    setFieldErrors({});

    setForm({
      areasCovered: session?.areasCovered || "",
      nextLessonGoals: session?.nextLessonGoals || "",
      postSessionFeedback: session?.postSessionFeedback || "",
    });
  }, [open, session]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((p) => ({ ...p, [name]: value }));

    if (submitted) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    const errs = {};

    if (!String(form.areasCovered).trim()) errs.areasCovered = "This field cannot be empty.";
    if (!String(form.nextLessonGoals).trim()) errs.nextLessonGoals = "This field cannot be empty.";
    if (!String(form.postSessionFeedback).trim()) errs.postSessionFeedback = "This field cannot be empty.";

    const areasW = countWords(form.areasCovered);
    const nextW = countWords(form.nextLessonGoals);
    const fbW = countWords(form.postSessionFeedback);

    if (String(form.areasCovered).trim() && areasW > MAX_WORDS.areasCovered) {
      errs.areasCovered = `Maximum ${MAX_WORDS.areasCovered} words. (You used ${areasW})`;
    }
    if (String(form.nextLessonGoals).trim() && nextW > MAX_WORDS.nextLessonGoals) {
      errs.nextLessonGoals = `Maximum ${MAX_WORDS.nextLessonGoals} words. (You used ${nextW})`;
    }
    if (String(form.postSessionFeedback).trim() && fbW > MAX_WORDS.postSessionFeedback) {
      errs.postSessionFeedback = `Maximum ${MAX_WORDS.postSessionFeedback} words. (You used ${fbW})`;
    }

    return errs;
  };

  const handleSubmit = async () => {
    setError("");
    setSubmitted(true);

    if (!session?.id) {
      setError("Session not found.");
      return;
    }

    const errs = validate();
    setFieldErrors(errs);

    if (Object.keys(errs).length > 0) {
      setError("Please fix the highlighted fields before submitting.");
      return;
    }

    try {
      setSaving(true);

      const now = new Date().toISOString();
      const payload = {
        areasCovered: form.areasCovered.trim(),
        nextLessonGoals: form.nextLessonGoals.trim(),
        postSessionFeedback: form.postSessionFeedback.trim(),
        updatedAt: now,
      };

      const res = await sessionsApi.update(session.id, payload);

      onSaved?.(res.data);
      window.alert("Session summary submitted successfully!");
      onClose();

    } catch (e) {
      setError(e.message || "Failed to submit session summary.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Summary of session" open={open} onClose={onClose}>
      <div className="mBody">
        <TextField
          label="What was covered?"
          name="areasCovered"
          value={form.areasCovered}
          onChange={handleChange}
          placeholder="e.g. Covered while-loops and solved 3 questions"
        />
        {submitted && fieldErrors.areasCovered ? (
          <div className="mHintError">{fieldErrors.areasCovered}</div>
        ) : null}

        <TextField
          label="What are the next lesson objectives?"
          name="nextLessonGoals"
          value={form.nextLessonGoals}
          onChange={handleChange}
          placeholder="e.g. Practise nested loops"
        />
        {submitted && fieldErrors.nextLessonGoals ? (
          <div className="mHintError">{fieldErrors.nextLessonGoals}</div>
        ) : null}

        <TextField
          label="Any feedback?"
          name="postSessionFeedback"
          value={form.postSessionFeedback}
          onChange={handleChange}
          placeholder="e.g. I liked the step-by-step explanation"
        />
        {submitted && fieldErrors.postSessionFeedback ? (
          <div className="mHintError">{fieldErrors.postSessionFeedback}</div>
        ) : null}

        {error ? <div className="mError">{error}</div> : null}

        <div className="mFooter">
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SessionSummaryModal;