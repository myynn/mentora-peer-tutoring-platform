import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import storage from "../storage";
import { usersApi } from "../api/users";
import { availabilitySlotsApi } from "../api/availabilitySlots";
import { sessionsApi } from "../api/sessions";
import Button from "../components/Button";
import Spinner from "../components/Spinner";
import TextField from "../components/TextField";
import MonthCalendar, { toDateKey } from "../components/MonthCalendar";
import "../styles/bookSession.css";

const BookSessionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tutorId } = useParams();

  const viewer = useMemo(() => storage.getUser(), []);

  // ui states
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [saving, setSaving] = useState(false);

  // word count helper
  const countWords = (text) =>
  String(text || "").trim().split(/\s+/).filter(Boolean).length;

  const WORD_LIMITS = {
  preSessionObjectives: 30,
  preSessionQuestions: 40,
  preSessionDifficulties: 30,
  };


  // Data
  const [tutor, setTutor] = useState(null);
  const [slots, setSlots] = useState([]);

  // calendar state
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  //availability slot selection
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState("");

  const [form, setForm] = useState({
    preSessionObjectives: "",
    preSessionQuestions: "",
    preSessionDifficulties: "",
  });
  const [errors, setErrors] = useState({});

  const goBack = () => navigate(-1);

  const prevMonth = () => {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() - 1);
    setMonthDate(d);
  };

  const nextMonth = () => {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() + 1);
    setMonthDate(d);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  // load tutor and avialability slots
  useEffect(() => {
    const load = async () => {
      try {
        setPageError("");
        setLoading(true);

        if (!viewer) {
          setPageError("You are not logged in.");
          setTutor(null);
          return;
        }
        if (viewer.role !== "tutee") {
          setPageError("Only tutee accounts can book sessions.");
          setTutor(null);
          return;
        }
        if (!tutorId) {
          setPageError("Tutor not found.");
          setTutor(null);
          return;
        }

        const tutorRes = await usersApi.getById(tutorId);
        const tutorUser = tutorRes.data;

        if (!tutorUser || tutorUser.role !== "tutor") {
          setPageError("This profile is not a tutor.");
          setTutor(null);
          return;
        }

        setTutor(tutorUser);

        const slotsRes = await availabilitySlotsApi.getByTutorId(tutorId);
        setSlots(Array.isArray(slotsRes.data) ? slotsRes.data : []);
      } catch (err) {
        setPageError(err.message || "Failed to load booking page.");
        setTutor(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [tutorId, viewer?.id, viewer?.role]);

  const slotsForSelectedDate = useMemo(() => {
    const key = toDateKey(selectedDate);
    return (slots || [])
      .filter((s) => String(s.slotDate || "").slice(0, 10) === key)
      .filter((s) => s.isBooked !== true);
  }, [slots, selectedDate]);

  useEffect(() => {
    setSelectedSlotId(null);
    setSelectedTimeRange("");
  }, [selectedDate]);

  const validate = () => {
    const next = {};
    const dateKey = toDateKey(selectedDate);

    if (!form.preSessionObjectives.trim()) {
      next.preSessionObjectives = "Please fill in your lesson objectives.";
    } else if (countWords(form.preSessionObjectives) > WORD_LIMITS.preSessionObjectives) {
      next.preSessionObjectives = `Max ${WORD_LIMITS.preSessionObjectives} words.`;
    }

    if (!form.preSessionQuestions.trim()) {
      next.preSessionQuestions = "Please fill in your burning questions.";
    } else if (countWords(form.preSessionQuestions) > WORD_LIMITS.preSessionQuestions) {
      next.preSessionQuestions = `Max ${WORD_LIMITS.preSessionQuestions} words.`;
    }

    if (!form.preSessionDifficulties.trim()) {
      next.preSessionDifficulties = "Please fill in your common difficulties.";
    } else if (countWords(form.preSessionDifficulties) > WORD_LIMITS.preSessionDifficulties) {
      next.preSessionDifficulties = `Max ${WORD_LIMITS.preSessionDifficulties} words.`;
    }


    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const selectedDateIsoAtNoon = () => {
    const d = new Date(selectedDate);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0).toISOString();
  };

  const parseQuestions = (text) => {
    return String(text || "")
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      setPageError("");

      const slot = (slots || []).find((s) => String(s.id) === String(selectedSlotId));
      if (!slot) {
        setPageError("Selected slot not found. Please pick again.");
        return;
      }
      if (slot.isBooked === true) {
        setPageError("This slot is already booked. Please pick another slot.");
        return;
      }

      const now = new Date().toISOString();

      const payload = {
        tutorId: tutor.id,
        tuteeId: viewer.id,
        slotId: slot.id,
        sessionDate: selectedDateIsoAtNoon(),
        sessionTimeRange: selectedTimeRange,
        status: "pending",
        cancelledBy: null,

        preSessionObjectives: form.preSessionObjectives.trim(),
        preSessionQuestions: parseQuestions(form.preSessionQuestions),
        preSessionDifficulties: form.preSessionDifficulties.trim(),

        areasCovered: "",
        nextLessonGoals: "",
        postSessionFeedback: "",

        tutorConfirmedAttendance: false,
        tuteeConfirmedAttendance: false,

        createdAt: now,
        updatedAt: now,
      };

      const created = await sessionsApi.create(payload);
      const createdSession = created?.data;


      window.alert("Booking request sent!");

      navigate("/tutee/sessions", {
        replace: true,
        state: {
          from: location.state?.from || "/tutee/tutors",
          refreshKey: Date.now(),
        },
      });


    } catch (err) {
      setPageError(err.message || "Failed to book session.");
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="bookPage">
        <div className="bookCard">
            <div className="bookHeader">
              <button className="bookBack" onClick={goBack} aria-label="Back">
                 ←
              </button>
              <div className="bookTitlePill">Booking</div>
              <div className="bookHeaderRight" />
            </div>

            <div className="bookCenter">
            <Spinner label="Loading booking form..." />
            </div>
        </div>
      </div>
    );
  }

  if (pageError && !tutor) {
    return (
      <div className="bookPage">
        <div className="bookCard">
            <div className="bookHeader">
            <button className="bookBack" onClick={goBack} aria-label="Back">
                ←
            </button>
            <div className="bookTitlePill">Booking</div>
            <div className="bookHeaderRight" />
            </div>

            <div className="bookCenter">
            <div className="bookError">{pageError}</div>
            <Button variant="secondary" onClick={goBack}>
                Go back
            </Button>
            </div>
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="bookPage">
        <div className="bookCard">
            <div className="bookHeader">
            <button className="bookBack" onClick={goBack} aria-label="Back">
                ←
            </button>
            <div className="bookTitlePill">Booking</div>
            <div className="bookHeaderRight" />
            </div>

            <div className="bookCenter">
            <div className="bookEmpty">Tutor not found.</div>
            <Button variant="secondary" onClick={goBack}>
                Go back
            </Button>
            </div>
        </div>
      </div>
    );
  }

//default state
return (
  <div className="bookPage">
    <div className="bookCard">
      <div className="bookHeader">
        <button className="bookBack" onClick={goBack} aria-label="Back">
          ←
        </button>
        <div className="bookTitlePill">Tutor: {tutor.username}</div>
        <div className="bookHeaderRight" />
      </div>

      <div className="bookCalendarWrap">
        <MonthCalendar
          monthDate={monthDate}
          selectedDate={selectedDate}
          onSelectDate={(d) => setSelectedDate(d)}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
        />
      </div>

      <div className="bookSlotsWrap">
        {errors.sessionTimeRange ? (
          <div className="bookFieldError">{errors.sessionTimeRange}</div>
        ) : null}

        {slotsForSelectedDate.length ? (
          <div className="bookSlotsRow">
            {slotsForSelectedDate.map((s) => {
              const selected = String(s.id) === String(selectedSlotId);
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`bookSlotChip ${selected ? "active" : ""}`}
                  onClick={() => {
                    setSelectedSlotId(s.id);
                    setSelectedTimeRange(s.timeRange);
                  }}
                >
                  {s.timeRange}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bookEmptyInline">No available slots for this date.</div>
        )}
      </div>

      <div className="bookForm">
        <TextField
          label="Lesson objectives"
          name="preSessionObjectives"
          value={form.preSessionObjectives}
          onChange={handleChange}
          placeholder="e.g. Understand while loops"
          error={errors.preSessionObjectives}
          multiline={true}
          rows={2}
        />

        <TextField
          label="Burning questions"
          name="preSessionQuestions"
          value={form.preSessionQuestions}
          onChange={handleChange}
          placeholder="e.g. When to use while vs for loops?"
          error={errors.preSessionQuestions}
          multiline={true}
          rows={2}
        />

        <TextField
          label="Common difficulties"
          name="preSessionDifficulties"
          value={form.preSessionDifficulties}
          onChange={handleChange}
          placeholder="e.g. I struggle with Python logic"
          error={errors.preSessionDifficulties}
          multiline={true}
          rows={2}
        />

        {pageError && tutor ? <div className="bookError">{pageError}</div> : null}

        <div className="bookActions">
          <Button onClick={handleSubmit} disabled={saving} className="bookSubmit">
            {saving ? "Sending..." : "Send request"}
          </Button>
        </div>
      </div>
    </div>
  </div>
);
};

export default BookSessionPage;