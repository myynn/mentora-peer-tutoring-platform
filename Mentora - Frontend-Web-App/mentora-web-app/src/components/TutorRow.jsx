import "../styles/tuteeTutors.css";
import TutorCard from "./TutorCard";

const TutorRow = ({ title, subtitle, tutors, onOpenProfile, onBookNow }) => {
  return (
    <section className="ttSectionOuter">
      <div className="ttSectionInner">
        <div className="ttSectionHeader">
          <div className="ttSectionTitle">{title}</div>
          {subtitle ? <div className="ttSectionSubtitle">{subtitle}</div> : null}
        </div>

        {tutors.length ? (
          <div className="ttRowScroller">
            {tutors.map((t) => (
              <TutorCard
                key={t.id}
                tutor={t}
                onOpenProfile={onOpenProfile}
                onBookNow={onBookNow}
              />
            ))}
          </div>
        ) : (
          <div className="ttEmptyRow">No tutors found for this section.</div>
        )}
      </div>
    </section>
  );
};

export default TutorRow;
