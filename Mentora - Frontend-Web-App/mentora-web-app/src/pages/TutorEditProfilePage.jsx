// imports
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import "../styles/form.css";
import "../styles/auth.css";
import TextField from "../components/TextField";
import SelectField from "../components/SelectField";
import Button from "../components/Button";
import Spinner from "../components/Spinner";
import storage from "../storage";
import { usersApi } from "../api/users";

const TutorEditProfilePage = () => {
  //navigation
  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  const viewer = useMemo(() => storage.getUser(), []);

  // ui states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [errors, setErrors] = useState({});
  const [user, setUser] = useState(null);

  const [form, setForm] = useState({
    schoolName: "",
    yearLevelsToTeach: "", 
    modulesAbleToTeach: "", 
    gpa: "", 
    shortBio: "",
    teachingStyle: "",
    descriptionTeachApproach: "",
    availableDays: "",
    sessionDurationMinutes: "", 
  });

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const wordCount = (text) =>
    String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

  const parseCsv = (value) =>
    String(value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const toCsv = (arr) => (Array.isArray(arr) ? arr.join(", ") : "");

  const isWholeNumber = (v) => /^\d+$/.test(String(v || "").trim());

  const getYearNumber = (yearStr) => {
    const match = String(yearStr || "").match(/\d+/);
    return match ? match[0] : "";
  };

  //  handle change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // validate 
  const validate = () => {
    const next = {};

    if (!form.schoolName.trim()) {
      next.schoolName = "Please enter your school name.";
    } else if (form.schoolName.trim().length > 60) {
      next.schoolName = "School name must be 60 characters or fewer.";
    }

    if (!form.yearLevelsToTeach) {
      next.yearLevelsToTeach = "Please select the year level you teach (1 to 5).";
    }

    if (!form.modulesAbleToTeach.trim()) {
      next.modulesAbleToTeach = "Please enter at least one module/subject you can teach.";
    } else if (form.modulesAbleToTeach.length > 80) {
      next.modulesAbleToTeach = "Module/Subject expertise must be 80 characters or fewer.";
    } else {
      const list = parseCsv(form.modulesAbleToTeach);
      if (list.length === 0) {
        next.modulesAbleToTeach = "Please enter modules separated by commas (e.g., FWEB, MBAP).";
      }
    }

    if (form.gpa.trim()) {
      const g = Number(form.gpa);
      if (Number.isNaN(g)) next.gpa = "GPA must be a number (e.g., 3.68).";
      else if (g < 0 || g > 4) next.gpa = "GPA must be between 0.00 and 4.00.";
    }

    const bioWords = wordCount(form.shortBio);
    if (!form.shortBio.trim()) {
      next.shortBio = "Please write a short bio so tutees can understand you better.";
    } else if (bioWords > 30) {
      next.shortBio = `Short bio must be 30 words or fewer. (Currently ${bioWords} words.)`;
    }

    if (!form.teachingStyle) {
      next.teachingStyle = "Please select your teaching style.";
    }

    const approachWords = wordCount(form.descriptionTeachApproach);
    if (!form.descriptionTeachApproach.trim()) {
      next.descriptionTeachApproach = "Please describe your teaching approach.";
    } else if (approachWords > 80) {
      next.descriptionTeachApproach = `How you teach must be 80 words or fewer. (Currently ${approachWords} words.)`;
    }

    if (!form.availableDays.trim()) {
      next.availableDays = "Please enter your availability (e.g., Mon, Tues).";
    } else if (form.availableDays.length > 80) {
      next.availableDays = "Availability must be 80 characters or fewer.";
    } else {
      const days = parseCsv(form.availableDays);
      if (days.length === 0) {
        next.availableDays = "Please enter days separated by commas (e.g., Mon, Tues).";
      }
    }

    if (!form.sessionDurationMinutes.trim()) {
      next.sessionDurationMinutes = "Please enter at least one session duration (e.g., 30, 60).";
    } else {
      const durations = parseCsv(form.sessionDurationMinutes);
      const invalid = durations.some((d) => !isWholeNumber(d));
      if (invalid) {
        next.sessionDurationMinutes =
          "Session duration must be whole numbers only (e.g., 30, 60). Do not include 'min'.";
      } else {
        const outOfRange = durations.some((d) => Number(d) < 15 || Number(d) > 240);
        if (outOfRange) {
          next.sessionDurationMinutes =
            "Session duration must be between 15 and 240 minutes (e.g., 30, 60).";
        }
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  //load current tutor data
  useEffect(() => {
    const load = async () => {
      try {
        setPageError("");
        setLoading(true);

        if (!viewer) {
          setPageError("You are not logged in.");
          setUser(null);
          return;
        }

        if (viewer.role !== "tutor") {
          setPageError("Only tutor accounts can edit this page.");
          setUser(null);
          return;
        }

        // get user from db.json by id
        const res = await usersApi.getById(viewer.id);
        const found = res.data;

        if (!found) {
          setUser(null);
          return;
        }

        if (found.role !== "tutor") {
          setPageError("This account is not a tutor profile.");
          setUser(null);
          return;
        }

        setUser(found);

        setForm({
          schoolName: found.schoolName || "",
          yearLevelsToTeach: Array.isArray(found.yearLevelsToTeach) && found.yearLevelsToTeach.length
            ? getYearNumber(found.yearLevelsToTeach[0])
            : "",
          modulesAbleToTeach: toCsv(found.modulesAbleToTeach),
          gpa: found.gpa === null || found.gpa === undefined ? "" : String(found.gpa),
          shortBio: found.shortBio || "",
          teachingStyle: found.teachingStyle || "",
          descriptionTeachApproach: found.descriptionTeachApproach || "",
          availableDays: toCsv(found.availableDays),
          sessionDurationMinutes: Array.isArray(found.sessionDurationMinutes)
            ? found.sessionDurationMinutes.map((n) => String(n)).join(", ")
            : "",
        });
      } catch (err) {
        setPageError(err.message || "Failed to load profile.");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [viewer?.id, viewer?.role]);

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setPageError("");
      setSaving(true);

      if (!user) {
        setPageError("Profile not found.");
        return;
      }

      const updatedAt = new Date().toISOString();

      const updatedUser = {
        ...user,

        schoolName: form.schoolName.trim(),
        yearLevelsToTeach: form.yearLevelsToTeach ? [`Year ${form.yearLevelsToTeach}`] : [],
        modulesAbleToTeach: parseCsv(form.modulesAbleToTeach),
        gpa: form.gpa.trim() ? Number(form.gpa) : null,
        shortBio: form.shortBio.trim(),
        teachingStyle: form.teachingStyle,
        descriptionTeachApproach: form.descriptionTeachApproach.trim(),
        availableDays: parseCsv(form.availableDays),
        sessionDurationMinutes: parseCsv(form.sessionDurationMinutes).map((n) => Number(n)),

        updatedAt,
      };

      await usersApi.update(user.id, updatedUser);

      window.alert("Profile updated successfully!");

      navigate("/tutor/profile", {
        replace: true,
        state: { refreshKey: Date.now() },
      });
    } catch (err) {
      setPageError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const yearOptions = [1, 2, 3, 4, 5].map((n) => ({ label: `${n}`, value: `${n}` }));

  const teachingOptions = [
    { label: "Visual", value: "Visual" },
    { label: "Step-by-step", value: "Step-by-step" },
    { label: "Discussion-based", value: "Discussion-based" },
  ];

  //loading state
  if (loading) {
    return (
      <div className="editPage">
        <div className="editCard">
          <div className="registerHeader">
            <button className="backBtn" onClick={goBack} aria-label="Back">
              ←
            </button>

            <div className="registerTitle">Edit profile</div>
            <div />
          </div>

          <Spinner label="Loading your profile..." />
        </div>
      </div>
    );
  }

  // error state
  if (pageError) {
    return (
      <div className="editPage">
        <div className="editCard">
          <div className="registerHeader">
            <button className="backBtn" onClick={goBack} aria-label="Back">
              ←
            </button>

            <div className="registerTitle">Edit profile</div>
            <div />
          </div>

          <div className="pageError">{pageError}</div>
          <Button variant="secondary" onClick={goBack}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  // empty state
  if (!user) {
    return (
      <div className="editPage">
        <div className="editCard">
          <div className="registerHeader">
            <button className="backBtn" onClick={goBack} aria-label="Back">
              ←
            </button>

            <div className="registerTitle">Edit profile</div>
            <div />
          </div>

          <div className="emptyState">Profile not found.</div>
          <Button variant="secondary" onClick={goBack}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  // default state
  return (
    <div className="editPage">
      <div className="editCard">
        <div className="registerHeader">
          <button className="backBtn" onClick={goBack} aria-label="Back">
            ←
          </button>

          <div className="registerTitle">Edit tutor profile</div>
          <div />
        </div>

        {pageError ? <div className="pageError">{pageError}</div> : null}

        <div className="section">
          <div className="sectionTitle">
            <span className="iconBox">🎓</span>
            <span>Academic background</span>
          </div>

          <TextField
            label="School name"
            name="schoolName"
            value={form.schoolName}
            onChange={handleChange}
            placeholder="Name of current school"
            error={errors.schoolName}
          />

          <SelectField
            label="Year you teach"
            name="yearLevelsToTeach"
            value={form.yearLevelsToTeach}
            onChange={handleChange}
            options={yearOptions}
            placeholder="Select year level"
            error={errors.yearLevelsToTeach}
          />

          <TextField
            label="Module/Subject expertise"
            name="modulesAbleToTeach"
            value={form.modulesAbleToTeach}
            onChange={handleChange}
            placeholder="e.g. FWEB, MBAP"
            error={errors.modulesAbleToTeach}
          />

          <TextField
            label="GPA (Optional)"
            name="gpa"
            value={form.gpa}
            onChange={handleChange}
            placeholder="e.g. 3.68"
            error={errors.gpa}
          />

          <TextField
            label="Short bio (Max 30 words)"
            name="shortBio"
            value={form.shortBio}
            onChange={handleChange}
            placeholder="Tell tutees about yourself..."
            error={errors.shortBio}
            multiline={true}
            rows={3}
          />

          <SelectField
            label="Teaching style"
            name="teachingStyle"
            value={form.teachingStyle}
            onChange={handleChange}
            options={teachingOptions}
            placeholder="Select your style"
            error={errors.teachingStyle}
          />

          <TextField
            label="How you teach (Max 80 words)"
            name="descriptionTeachApproach"
            value={form.descriptionTeachApproach}
            onChange={handleChange}
            placeholder="Describe your teaching approach..."
            error={errors.descriptionTeachApproach}
            multiline={true}
            rows={3}
          />
        </div>

        <div className="section">
          <div className="sectionTitle">
            <span className="iconBox">📅</span>
            <span>Availability</span>
          </div>

          <TextField
            label="Availability"
            name="availableDays"
            value={form.availableDays}
            onChange={handleChange}
            placeholder="e.g. Mon, Tues"
            error={errors.availableDays}
          />

          <TextField
            label="Session duration (Minutes)"
            name="sessionDurationMinutes"
            value={form.sessionDurationMinutes}
            onChange={handleChange}
            placeholder="e.g. 30, 60"
            error={errors.sessionDurationMinutes}
          />
        </div>

        <div className="registerActions">
          <Button onClick={handleSave} disabled={saving} variant="primary" className="btn-auth">
            {saving ? "Saving..." : "Save changes"}
          </Button>

          {saving ? <Spinner label="Saving your changes..." /> : null}
        </div>
      </div>
    </div>
  );
};

export default TutorEditProfilePage;