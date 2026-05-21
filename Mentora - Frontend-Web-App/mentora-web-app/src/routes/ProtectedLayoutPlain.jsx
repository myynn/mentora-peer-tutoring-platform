// 1. imports
import { Outlet } from "react-router";

// 2. layout used for logged in screens that do not need the top navbar
const ProtectedLayoutPlain = () => {
  return (
    <main style={{ padding: "18px" }}>
      <Outlet />
    </main>
  );
};

export default ProtectedLayoutPlain;
