
import "../styles/settingsPage.css";

const LogoutBar = ({ onLogout }) => {
  return (
    <button type="button" className="setLogoutBar" onClick={onLogout}>
      <div className="setMenuLeft">
        <span className="material-symbols-outlined setMenuIcon">logout</span>
        <span className="setMenuLabel">Logout</span>
      </div>

      <span className="material-symbols-outlined setMenuArrow">chevron_right</span>
    </button>
  );
};

export default LogoutBar;