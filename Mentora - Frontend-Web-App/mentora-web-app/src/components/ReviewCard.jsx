import Button from "./Button";

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const starsText = (rating = 0) =>
  "⭐".repeat(Math.max(0, Math.min(5, Number(rating) || 0))) +
  "☆".repeat(Math.max(0, 5 - (Number(rating) || 0)));

const ReviewCard = ({ name, rating, comment, createdAt, canManage, onEdit, onDelete }) => {
  return (
    <div className="reviewCard">
      <div className="reviewTopRow">
        <div className="reviewName">{name}</div>
        <div className="reviewDate">{formatDate(createdAt)}</div>
      </div>

      <div className="reviewStars">{starsText(Number(rating || 0))}</div>
      <div className="reviewComment">{comment}</div>

      {canManage ? (
        <div className="reviewActions">
          <Button variant="secondary" onClick={onEdit}>Edit</Button>
          <Button variant="secondary" onClick={onDelete}>Delete</Button>
        </div>
      ) : null}
    </div>
  );
};

export default ReviewCard;