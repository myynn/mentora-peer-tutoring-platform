
import "../styles/spinner.css";

export default function Spinner({ label = "Loading..." }) {
  return (
    <div className="spinnerWrap" role="status" aria-live="polite">
      <div className="spinner" />
      <div className="spinnerLabel">{label}</div>
    </div>
  );
}
