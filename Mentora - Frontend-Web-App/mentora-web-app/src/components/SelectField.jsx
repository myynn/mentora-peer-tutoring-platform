
import "../styles/form.css";

export default function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  error = "",
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={name}>{label}</label>

      <select
        id={name}
        name={name}
        className={`select ${error ? "inputError" : ""}`}
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {error ? (
        <div id={`${name}-error`} className="errorText">
          {error}
        </div>
      ) : null}
    </div>
  );
}
