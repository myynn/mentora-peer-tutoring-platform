import { Link } from "react-router";

const NotFound = () => {
  return (
    <div style={{ padding: 24 }}>
      <h2>404 - Page Not Found</h2>
      <p>The page you are looking for does not exist.</p>
      <Link to="/tutee/login">Go to Login</Link>
    </div>
  );
};
export default NotFound;
