const StarRating = ({ value, onChange, size = 34 }) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {stars.map((n) => {
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`Rate ${n} star`}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: size,
              lineHeight: 1,
            }}
          >
            {filled ? "⭐" : "☆"}
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
