
import "../styles/form.css";

export default function TextField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder = "",
  error = "",
  hideLabel = false,
  multiline = false,
  rows = 3,
}) {

  const InputTag = multiline ? "textarea" : "input";
  
  return (
    <div className="field">
      {hideLabel ? null : (
        <label className="label" htmlFor={name}>{label}</label>
      )}

      <input
        id={name}
        name={name}
        type={type}
        className={`input ${error ? "inputError" : ""}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      />

      {error ? (
        <div id={`${name}-error`} className="errorText">
          {error}
        </div>
      ) : null}
    </div>
  );
}
