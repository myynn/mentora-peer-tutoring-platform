// imports
import { useState } from "react";
import { useNavigate } from "react-router";
import "../styles/auth.css";
import "../styles/form.css";
import TextField from "../components/TextField";
import SelectField from "../components/SelectField";
import Button from "../components/Button";
import Spinner from "../components/Spinner";
import { api } from "../api";
import storage from "../storage";

const TutorRegister = () => {
  //  controlled form state
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
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

  // UI states
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [errors, setErrors] = useState({});

  //navigation
  const navigate = useNavigate();

  // handle change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  //  simple validation helpers
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const wordCount = (text) =>
    text
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

  const parseCsv = (value) =>
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const isWholeNumber = (v) => /^\d+$/.test(v);

  //  validate
  const validate = () => {
    const next = {};
    const u = form.username.trim();
    const e = form.email.trim();

    if (!u) next.username = "Please enter a username.";
    else if (u.length > 40) next.username = "Username must be 40 characters or fewer.";

    if (!e) next.email = "Please enter your email.";
    else if (!isEmail(e)) next.email = "Please enter a valid email address.";

    if (!form.password) next.password = "Please create a password.";
    else if (form.password.length < 8) next.password = "Password must be at least 8 characters.";

    if (!form.schoolName.trim()) next.schoolName = "Please enter your school name.";

    if (!form.yearLevelsToTeach) {
        next.yearLevelsToTeach = "Please select the year level you teach (1 to 5).";
    }


    if (!form.modulesAbleToTeach.trim()) {
      next.modulesAbleToTeach = "Please enter at least one module/subject you can teach.";
    } else if (form.modulesAbleToTeach.length > 80) {
      next.modulesAbleToTeach = "Module/Subject expertise must be 80 characters or fewer.";
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

    if (!form.teachingStyle) next.teachingStyle = "Please select your teaching style.";

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
        const outOfRange = durations.some(
        (d) => Number(d) < 15 || Number(d) > 240
        );

        if (outOfRange) {
        next.sessionDurationMinutes =
            "Session duration must be between 15 and 240 minutes (e.g., 30, 60).";
        }
      }
    }


    setErrors(next);
    return Object.keys(next).length === 0;
  };

  //  submit register form
  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setPageError("");
      setLoading(true);


      const payload = {

        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: "tutor",
        schoolName: form.schoolName.trim(),
        availableDays: parseCsv(form.availableDays),

        yearLevelsToTeach: form.yearLevelsToTeach ? [`Year ${form.yearLevelsToTeach}`] : [],
        modulesAbleToTeach: parseCsv(form.modulesAbleToTeach),
        shortBio: form.shortBio.trim(),
        gpa: form.gpa.trim() ? Number(form.gpa) : null,
        teachingStyle: form.teachingStyle,
        descriptionTeachApproach: form.descriptionTeachApproach.trim(),
        sessionDurationMinutes: parseCsv(form.sessionDurationMinutes).map((n) => Number(n)),
      };

      //  call API layer
      const res = await api.auth.registerTutor(payload);

      //  auto-login after successful registration
      storage.setUser({
        id: res.data.id,
        _id: res.data._id,
        username: res.data.username,
        role: res.data.role,
      });

      //  go to tutor home
      navigate("/tutor/sessions", { replace: true });
    } catch (err) {
      setPageError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  //  dropdown options
  const yearOptions = [1, 2, 3, 4, 5].map((n) => ({ label: `${n}`, value: `${n}` }));

  const teachingOptions = [
    { label: "Visual", value: "Visual" },
    { label: "Step-by-step", value: "Step-by-step" },
    { label: "Discussion-based", value: "Discussion-based" },
  ];

  return (
    <div className="registerPage">
      <div className="registerCard">
        <div className="registerHeader">
          <button className="backBtn" onClick={() => navigate("/tutor/login")} aria-label="Back">
            ←
          </button>
          <div className="registerTitle">Tutor registration</div>
        </div>

        {pageError ? <div className="pageError">{pageError}</div> : null}

        <div className="section">
          <div className="sectionTitle">
            <span className="iconBox">👤</span>
            <span>Account information</span>
          </div>

          <TextField
            label="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Choose a username"
            error={errors.username}
          />
          <TextField
            label="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="your.email@example.com"
            error={errors.email}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Create a strong password"
            error={errors.password}
          />
        </div>

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
            placeholder="e.g. Machine Learning, Logic and Mathematics"
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
            placeholder="Tell tutees about yourself, your hobbies, what you enjoy doing..."
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
            label="How you teach (Max 50 words)"
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
          <Button onClick={handleSubmit} disabled={loading} variant="primary" className="btn-auth">
            {loading ? "Creating..." : "Create tutor profile"}
          </Button>

          {loading ? <Spinner label="Creating your account..." /> : null}
        </div>
      </div>
    </div>
  );
};

export default TutorRegister;
