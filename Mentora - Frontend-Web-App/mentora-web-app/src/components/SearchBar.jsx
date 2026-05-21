import "./../styles/tuteeTutors.css";

const SearchBar = ({ value, onChange, placeholder }) => {
  return (
    <div className="ttSearchWrap">
      <div className="ttSearchIcon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path
            d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm11 3-6.2-6.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <input
        className="ttSearchInput"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label="Search tutors"
      />
    </div>
  );
};

export default SearchBar;
