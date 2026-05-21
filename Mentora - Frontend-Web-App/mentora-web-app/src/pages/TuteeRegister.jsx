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

const TuteeRegister = () => {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    schoolName: "",
    yearOfStudy: "",
    modulesNeedHelpWith: "",
    learningStyle: "",
    availableDays: "",
  });

  //  ui states
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [errors, setErrors] = useState({});

  //  navigation
  const navigate = useNavigate();

  //  handle change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  //  simple validation helpers
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

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

    if (!form.yearOfStudy) next.yearOfStudy = "Please select your year of study (1 to 5).";

    if (!form.modulesNeedHelpWith.trim())
      next.modulesNeedHelpWith = "Please enter at least one module/subject.";
    else if (form.modulesNeedHelpWith.length > 150)
      next.modulesNeedHelpWith = "Module/subject must be 150 characters or fewer.";

    if (!form.learningStyle) next.learningStyle = "Please select your learning style.";

    if (!form.availableDays.trim())
      next.availableDays = "Please enter your availability (e.g., Mon, Tues).";
    else if (form.availableDays.length > 30)
      next.availableDays = "Availability must be 30 characters or fewer.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  //  submit register
  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setPageError("");
      setLoading(true);


      const payload = {

        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: "tutee",
        schoolName: form.schoolName.trim(),
        availableDays: form.availableDays
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),

        yearOfStudy: `Year ${form.yearOfStudy}`,
        modulesNeedHelpWith: form.modulesNeedHelpWith
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        learningStyle: form.learningStyle,
      };

      // call api layer
      const res = await api.auth.registerTutee(payload);

      //  auto login after register
      storage.setUser({
        id: res.data.id,
        _id: res.data._id,
        username: res.data.username,
        role: res.data.role,
      });

      // go to tutee home
      navigate("/tutee/tutors", { replace: true });
    } catch (err) {
      setPageError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // dropdown options
  const yearOptions = [1, 2, 3, 4, 5].map((n) => ({ label: `${n}`, value: `${n}` }));

  const learningOptions = [
    { label: "Visual", value: "Visual" },
    { label: "Step-by-step", value: "Step-by-step" },
    { label: "Discussion-based", value: "Discussion-based" },
  ];

  return (
    <div className="registerPage">
      <div className="registerCard">
        <div className="registerHeader">
          <button className="backBtn" onClick={() => navigate("/tutee/login")} aria-label="Back">
            ←
          </button>
          <div className="registerTitle">Tutee registration</div>
        </div>

        {pageError ? <div className="pageError">{pageError}</div> : null}

        <div className="section">
          <div className="sectionTitle">
            <span className="iconBox">👤</span>
            <span>Account information</span>
          </div>

          <TextField label="Username" name="username" value={form.username} onChange={handleChange} placeholder="Choose a username" error={errors.username} />
          <TextField label="Email" name="email" value={form.email} onChange={handleChange} placeholder="your.email@example.com" error={errors.email} />
          <TextField label="Password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Create a strong password" error={errors.password} />
        </div>

        <div className="section">
          <div className="sectionTitle">
            <span className="iconBox">🎓</span>
            <span>Academic background</span>
          </div>

          <TextField label="School name" name="schoolName" value={form.schoolName} onChange={handleChange} placeholder="Name of current school" error={errors.schoolName} />

          <SelectField
            label="Year of study"
            name="yearOfStudy"
            value={form.yearOfStudy}
            onChange={handleChange}
            options={yearOptions}
            placeholder="Select year level"
            error={errors.yearOfStudy}
          />

          <TextField
            label="Module/Subject of interest"
            name="modulesNeedHelpWith"
            value={form.modulesNeedHelpWith}
            onChange={handleChange}
            placeholder="e.g. Machine Learning, Logic and Mathematics"
            error={errors.modulesNeedHelpWith}
          />

          <SelectField
            label="Learning style"
            name="learningStyle"
            value={form.learningStyle}
            onChange={handleChange}
            options={learningOptions}
            placeholder="Select your learning style"
            error={errors.learningStyle}
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
        </div>

        <div className="registerActions">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            variant="primary"
            className="btn-auth"
          >
            {loading ? "Creating..." : "Create tutee profile"}
          </Button>

          {loading ? <Spinner label="Creating your account..." /> : null}
        </div>
      </div>
    </div>
  );
};

export default TuteeRegister;
