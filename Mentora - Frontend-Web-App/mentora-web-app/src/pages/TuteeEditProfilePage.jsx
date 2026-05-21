//imports
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

const TuteeEditProfilePage = () => {
  //  navigation
  const navigate = useNavigate();

  //  viewer from localstorage
  const viewer = useMemo(() => storage.getUser(), []);

  //  ui states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [errors, setErrors] = useState({});
  const [user, setUser] = useState(null);

  const [form, setForm] = useState({
    schoolName: "",
    yearOfStudy: "", 
    modulesNeedHelpWith: "",
    learningStyle: "", 
    availableDays: "", 
  });

  // helpers
  const parseCsv = (value) =>
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const toCsv = (arr) => (Array.isArray(arr) ? arr.join(", ") : "");

  const getYearNumber = (yearStr) => {

    const match = String(yearStr || "").match(/\d+/);
    return match ? match[0] : "";
  };

  //handle change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  //validate
  const validate = () => {
    const next = {};

    if (!form.schoolName.trim()) next.schoolName = "Please enter your school name.";
    else if (form.schoolName.trim().length > 60)
      next.schoolName = "School name must be 60 characters or fewer.";

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

    const modulesList = parseCsv(form.modulesNeedHelpWith);
    if (form.modulesNeedHelpWith.trim() && modulesList.length === 0) {
      next.modulesNeedHelpWith = "Please enter modules separated by commas (e.g., FWEB, MBAP).";
    }

    const daysList = parseCsv(form.availableDays);
    if (form.availableDays.trim() && daysList.length === 0) {
      next.availableDays = "Please enter days separated by commas (e.g., Mon, Tues).";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  //load current tutee data 
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

        if (viewer.role !== "tutee") {
          setPageError("Only tutee accounts can edit this page.");
          setUser(null);
          return;
        }

        const res = await usersApi.getById(viewer.id);
        const found = res.data;

        if (!found) {
          setUser(null);
          return;
        }

        if (found.role !== "tutee") {
          setPageError("This account is not a tutee profile.");
          setUser(null);
          return;
        }

        setUser(found);

        setForm({
          schoolName: found.schoolName || "",
          yearOfStudy: getYearNumber(found.yearOfStudy),
          modulesNeedHelpWith: toCsv(found.modulesNeedHelpWith),
          learningStyle: found.learningStyle || "",
          availableDays: toCsv(found.availableDays),
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
        yearOfStudy: `Year ${form.yearOfStudy}`,
        modulesNeedHelpWith: parseCsv(form.modulesNeedHelpWith),
        learningStyle: form.learningStyle,
        availableDays: parseCsv(form.availableDays),

        updatedAt,
      };

      // call api layer
      await usersApi.update(user.id, updatedUser);

      window.alert("Profile updated successfully!");

      navigate("/tutee/profile", {
        replace: true,
        state: { refreshKey: Date.now() },
      });

    } catch (err) {
      setPageError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  // dropdown options
  const yearOptions = [1, 2, 3, 4, 5].map((n) => ({ label: `${n}`, value: `${n}` }));

  const learningOptions = [
    { label: "Visual", value: "Visual" },
    { label: "Step-by-step", value: "Step-by-step" },
    { label: "Discussion-based", value: "Discussion-based" },
  ];

  // loading state
  if (loading) {
    return (
      <div className="editPage">
        <div className="editCard">
          <div className="registerHeader">
            <button className="backBtn" onClick={() => navigate(-1)} aria-label="Back">
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
            <button className="backBtn" onClick={() => navigate(-1)} aria-label="Back">
              ←
            </button>
            <div className="registerTitle">Edit profile</div>
            <div />
          </div>

          <div className="pageError">{pageError}</div>
          <Button variant="secondary" onClick={() => navigate(-1)}>
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
            <button className="backBtn" onClick={() => navigate(-1)} aria-label="Back">
              ←
            </button>
            <div className="registerTitle">Edit profile</div>
            <div />
          </div>

          <div className="emptyState">Profile not found.</div>
          <Button variant="secondary" onClick={() => navigate(-1)}>
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
          <button className="backBtn" onClick={() => navigate(-1)} aria-label="Back">
            ←
          </button>
          <div className="registerTitle">Edit tutee profile</div>
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
            label="Year of study"
            name="yearOfStudy"
            value={form.yearOfStudy}
            onChange={handleChange}
            options={yearOptions}
            placeholder="Select year level"
            error={errors.yearOfStudy}
          />

          <TextField
            label="Modules I need help with"
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
            label="Available days"
            name="availableDays"
            value={form.availableDays}
            onChange={handleChange}
            placeholder="e.g. Mon, Tues"
            error={errors.availableDays}
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

export default TuteeEditProfilePage;