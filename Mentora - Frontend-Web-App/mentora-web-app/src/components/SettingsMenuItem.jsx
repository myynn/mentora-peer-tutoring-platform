
import "../styles/settingsPage.css";

const SettingsMenuItem = ({ icon, label, onClick }) => {
  return (
    <button type="button" className="setMenuItem" onClick={onClick}>
      <div className="setMenuLeft">
        <span className="material-symbols-outlined setMenuIcon">{icon}</span>
        <span className="setMenuLabel">{label}</span>
      </div>

      <span className="material-symbols-outlined setMenuArrow">chevron_right</span>
    </button>
  );
};

export default SettingsMenuItem;