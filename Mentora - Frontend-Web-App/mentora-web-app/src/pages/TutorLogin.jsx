// imports
import { useState } from "react";
import { useNavigate, Link } from "react-router";
import AuthLayout from "../components/AuthLayout";
import TextField from "../components/TextField";
import Button from "../components/Button";
import Spinner from "../components/Spinner";
import { api } from "../api";
import storage from "../storage";

const TutorLogin = () => {
  // state for form
  const [form, setForm] = useState({ username: "", password: "" });

  // ui states
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  // validation errors
  const [errors, setErrors] = useState({});

  // navigation
  const navigate = useNavigate();

  // handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // validate inputs
  const validate = () => {
    const next = {};
    if (!form.username.trim()) next.username = "Please enter your username.";
    if (!form.password) next.password = "Please enter your password.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  //  login submit
  const handleLogin = async () => {
    if (!validate()) return;

    try {
      setPageError("");
      setLoading(true);

      //call api layer
      const res = await api.auth.login({
        username: form.username.trim(),
        password: form.password,
      });

      //  role guard
      if (res.data.role !== "tutor") {
        throw new Error("This account is not a tutor account. Please use Tutee Login.");
      }

      // store session
      storage.setUser({
        id: res.data.id,
        _id: res.data._id,
        username: res.data.username,
        role: res.data.role,
      });

      // redirect
      navigate("/tutor/sessions", { replace: true });
    } catch (err) {
      setPageError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="authRightInner">
        <h1 className="title">Welcome back, tutor!</h1>
        <div className="subtitle">
          Ready to teach someone today?<br />
          <b>Login to continue.</b>
        </div>

        {pageError ? <div className="pageError">{pageError}</div> : null}

        <div className="formStack">
          <TextField
            label="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Username"
            error={errors.username}
            hideLabel={true}
          />

          <TextField
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            error={errors.password}
            hideLabel={true}
          />

          <div className="btnStack">
            <Button onClick={handleLogin} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>

            <div className="orDivider" aria-hidden="true">
              <span className="line" />
              <span className="orText">OR</span>
              <span className="line" />
            </div>

            <Button
              variant="secondary"
              onClick={() => navigate("/tutee/login")}
              disabled={loading}
            >
              Login as tutee →
            </Button>
          </div>

          <div className="registerRow">
            <span>Don’t have an account?</span>{" "}
            <Link className="registerLink" to="/tutor/register">
              Register
            </Link>
          </div>

          {loading ? <Spinner label="Checking your account..." /> : null}
        </div>
      </div>
    </AuthLayout>
  );
};

export default TutorLogin;
