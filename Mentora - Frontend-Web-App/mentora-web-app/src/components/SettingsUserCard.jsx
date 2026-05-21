
import "../styles/settingsPage.css";

const getInitials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
};

const toTitle = (v = "") => String(v).charAt(0).toUpperCase() + String(v).slice(1);

const SettingsUserCard = ({ user }) => {
  return (
    <div className="setUserCard">
      <div className="setUserCardRow">
        <div className="setAvatar">{getInitials(user?.username)}</div>

        <div className="setUserInfo">
          <div className="setUserName">{user?.username || "-"}</div>

          <div className="setUserMeta">
            <span className="setRole">{toTitle(user?.role || "-")}</span>
            <span className="setDivider">|</span>
            <span className="setSchool">{user?.schoolName || "-"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsUserCard;