// 1. imports
import { Outlet } from "react-router";
import TopNavBar from "../components/TopNavBar";

// 2. layout used for logged-in screens that need the topnavbar
const ProtectedLayoutWithNav= () => {
  return (
    <div>
      <TopNavBar />
      <main style={{ padding: "18px" }}>
        <Outlet />
      </main>
    </div>
  );
};

export default ProtectedLayoutWithNav;
