//  imports
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import storage from "../storage";
import { usersApi } from "../api/users";
import { reviewsApi } from "../api/reviews";
import { availabilitySlotsApi } from "../api/availabilitySlots";
import { statsApi } from "../api/stats";
import Button from "../components/Button";
import Spinner from "../components/Spinner";
import Modal from "../components/Modal";
import StarRating from "../components/StarRating";
import ReviewCard from "../components/ReviewCard";
import MonthCalendar, { toDateKey } from "../components/MonthCalendar";
import TextField from "../components/TextField";
import "../styles/tutorProfile.css";
import BadgeCard from "../components/BadgeCard";
import "../styles/achievements.css";
import { badgesApi } from "../api/badges";

const TutorProfilePage = () => {
  //  routing hooks
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const refreshKey = location.state?.refreshKey;

  //  logged-in user
  const [viewer] = useState(() => storage.getUser());

  //  decide which tutor profile to load
  const profileId = useMemo(() => {
    return params?.id ? params.id : viewer?.id;
  }, [params?.id, viewer?.id]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [profile, setProfile] = useState(null);

  const [slots, setSlots] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewerMap, setReviewerMap] = useState({});


  //  modal states
  const [rateOpen, setRateOpen] = useState(false);
  const [slotOpen, setSlotOpen] = useState(false);

  //  rate form state
  const [rateSaving, setRateSaving] = useState(false);
  const [rateValue, setRateValue] = useState(0);
  const [rateComment, setRateComment] = useState("");
  const [rateError, setRateError] = useState("");

  // edit review modal
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editReview, setEditReview] = useState(null);
  const [editValue, setEditValue] = useState(0);
  const [editComment, setEditComment] = useState("");

  // delete confirm modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteReview, setDeleteReview] = useState(null);

  //  availability slot form state (calendar and timerange)
  const [slotSaving, setSlotSaving] = useState(false);
  const [slotError, setSlotError] = useState("");
  // main calendar that is shown on tutor profile page
  const [mainMonthDate, setMainMonthDate] = useState(() => new Date());
  const [mainSelectedDate, setMainSelectedDate] = useState(() => new Date());
  // modal calendar to add time slots
  const [slotMonthDate, setSlotMonthDate] = useState(() => new Date());
  const [slotSelectedDate, setSlotSelectedDate] = useState(() => new Date());
  const [timeRange, setTimeRange] = useState("");

  const [badgeObjects, setBadgeObjects] = useState([]);

  const getInitials = (name = "") => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    const first = parts[0][0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  };

  const starsText = (rating = 0) => {
    const r = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return "⭐".repeat(r) + "☆".repeat(5 - r);
  };

  const formatSelectedDateLabel = (d) => {
    if (!d) return "";
    const day = d.getDate();
    const month = d.toLocaleDateString(undefined, { month: "short" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  //  load data
  useEffect(() => {
    const load = async () => {
      try {
        setPageError("");
        setLoading(true);

        //  guards
        if (!viewer) {
          setPageError("You are not logged in.");
          setProfile(null);
          return;
        }
        if (!profileId) {
          setPageError("Profile not found.");
          setProfile(null);
          return;
        }

        const userRes = await usersApi.getById(profileId);
        const tutor = userRes.data;

        if (!tutor) {
          setProfile(null);
          return;
        }

        if (tutor.role !== "tutor") {
          setPageError("This profile is not a tutor profile.");
          setProfile(null);
          return;
        }

        setProfile(tutor);

        const keys = (tutor.badges || []).map((x) => String(x).trim()).filter(Boolean);

        if (keys.length === 0) {
          setBadgeObjects([]);
        } else {
          try {
            const resB = await badgesApi.getByKeys(keys);
            const badges = Array.isArray(resB.data) ? resB.data : [];
            setBadgeObjects(badges.map((b) => ({ ...b, earned: true })));
          } catch {
            setBadgeObjects([]);
          }
        }

        const [slotsRes, reviewsRes] = await Promise.all([
          availabilitySlotsApi.getByTutorId(tutor.id),
          reviewsApi.getByTutorId(tutor.id),
        ]);

        setSlots(Array.isArray(slotsRes.data) ? slotsRes.data : []);
        const reviewList = Array.isArray(reviewsRes.data) ? reviewsRes.data : [];
        setReviews(reviewList);

        const uniqueTuteeIds = [...new Set(reviewList.map(r => String(r.tuteeId)).filter(Boolean))];

        if (uniqueTuteeIds.length) {
          const userCalls = uniqueTuteeIds.map((id) =>
            usersApi.getById(id).then(res => ({ id, username: res.data?.username || "Tutee" })).catch(() => ({ id, username: "Tutee" }))
          );

          const results = await Promise.all(userCalls);
          const map = {};
          results.forEach(x => { map[x.id] = x.username; });
          setReviewerMap(map);
        } else {
          setReviewerMap({});
        }

      } catch (err) {
        setPageError(err.message || "Failed to load tutor profile.");
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [profileId, refreshKey]);

  const isOwner = viewer && profile && String(viewer.id) === String(profile.id);

  const headerTitle = isOwner ? "Your tutor profile" : "Tutor's profile";

  const showTutorButtons = isOwner && viewer?.role === "tutor";
  const showTuteeButtons = !isOwner && viewer?.role === "tutee";

  //  handlers
  const goBack = () => {
    const from = location.state?.profileFrom || location.state?.from;
    if (from) navigate(from, { replace: true });
    else navigate(-1);
  };


  const goEdit = () => navigate("/tutor/profile/edit");
  const goBookNow = () => {
    navigate(`/tutee/book/${profile.id}`, {
      state: {
        from: location.pathname,
        profileFrom: location.state?.from,
      },
    });
  };

  const reviewerName = (review) => {
    const id = String(review?.tuteeId || "");
    if (!id) return "Tutee";
    return reviewerMap[id] || "Tutee";
  };

  //filter availability slots for that selected date
  const slotsForSelectedDate = useMemo(() => {
    const pick = mainSelectedDate;
    if (!pick) return [];
    const key = toDateKey(pick);

    return (slots || [])
      .filter((s) => {
        const slotKey = String(s.slotDate || "").slice(0, 10);
        return slotKey === key;
      })
      .filter((s) => s.isBooked !== true);
  }, [slots, mainSelectedDate]);

  const pointsEarned = Number(profile?.points || 0);


  //  validate tutor rating form
  const validateRate = () => {
    const maxWords = 30;
    const words = rateComment.trim().split(/\s+/).filter(Boolean);

    if (!rateValue || rateValue < 1 || rateValue > 5) return "Please select a star rating (1–5).";
    if (!rateComment.trim()) return "Please write a short review comment.";
    if (rateComment.trim().length > 180) return "Comment must be 180 characters or fewer.";
    if (words.length > maxWords) return `Comment must be ${maxWords} words or fewer.`;
    return "";
  };


  //  submit rating
  const submitRating = async () => {
    try {
      setRateError("");
      setRateSaving(true);

      if (!profile) {
        setRateError("Tutor profile not found.");
        return;
      }

      const err = validateRate();
      if (err) {
        setRateError(err);
        return;
      }

      const now = new Date().toISOString();

      const payload = {
        tutorId: profile.id,
        tuteeId: viewer.id,
        rating: rateValue,
        comment: rateComment.trim(),
        createdAt: now,
      };

      await reviewsApi.create(payload);
      await statsApi.recomputeTutorRating(profile.id);

      const reviewsRes = await reviewsApi.getByTutorId(profile.id);
      const reviewList = Array.isArray(reviewsRes.data) ? reviewsRes.data : [];
      setReviews(reviewList);

      const uniqueTuteeIds = [...new Set(reviewList.map(r => String(r.tuteeId)).filter(Boolean))];
      const userCalls = uniqueTuteeIds.map((id) =>
        usersApi.getById(id).then(res => ({ id, username: res.data?.username || "Tutee" })).catch(() => ({ id, username: "Tutee" }))
      );
      const results = await Promise.all(userCalls);
      const map = {};
      results.forEach(x => { map[x.id] = x.username; });
      setReviewerMap(map);

      const userRes = await usersApi.getById(profile.id);
      setProfile(userRes.data);

      window.alert("Thanks! Your review has been submitted.");

      setRateValue(0);
      setRateComment("");
      setRateOpen(false);
    } catch (e) {
      setRateError(e.message || "Failed to submit rating.");
    } finally {
      setRateSaving(false);
    }
  };

  const validateEdit = () => {
    const maxWords = 30;
    const words = editComment.trim().split(/\s+/).filter(Boolean);

    if (!editValue || editValue < 1 || editValue > 5) return "Please select a star rating (1–5).";
    if (!editComment.trim()) return "Please write a short review comment.";
    if (editComment.trim().length > 180) return "Comment must be 180 characters or fewer.";
    if (words.length > maxWords) return `Comment must be ${maxWords} words or fewer.`;
    return "";
  };

  const openEditReview = (r) => {
    setEditError("");
    setEditReview(r);
    setEditValue(Number(r.rating || 0));
    setEditComment(String(r.comment || ""));
    setEditOpen(true);
  };

  const openDeleteReview = (r) => {
    setDeleteError("");
    setDeleteReview(r);
    setDeleteOpen(true);
  };

  const submitEditReview = async () => {
    try {
      setEditError("");
      setEditSaving(true);

      if (!editReview) return;

      const err = validateEdit();
      if (err) {
        setEditError(err);
        return;
      }

      await reviewsApi.update(editReview.id, {
        rating: editValue,
        comment: editComment.trim(),
      });

      if (profile?.id) await statsApi.recomputeTutorRating(profile.id);

      const reviewsRes = await reviewsApi.getByTutorId(profile.id);
      const list = Array.isArray(reviewsRes.data) ? reviewsRes.data : [];
      setReviews(list);

      const userRes = await usersApi.getById(profile.id);
      setProfile(userRes.data);

      window.alert("Your review has been updated successfully.");

      setEditOpen(false);
    } catch (e) {
      setEditError(e.message || "Failed to update review.");
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDeleteReview = async () => {
    try {
      setDeleteError("");
      setDeleteSaving(true);

      if (!deleteReview) return;

      await reviewsApi.remove(deleteReview.id);

      if (profile?.id) await statsApi.recomputeTutorRating(profile.id);

      const reviewsRes = await reviewsApi.getByTutorId(profile.id);
      const list = Array.isArray(reviewsRes.data) ? reviewsRes.data : [];
      setReviews(list);

      const userRes = await usersApi.getById(profile.id);
      setProfile(userRes.data);

      window.alert("Your review has been deleted successfully.");

      setDeleteOpen(false);
    } catch (e) {
      setDeleteError(e.message || "Failed to delete review.");
    } finally {
      setDeleteSaving(false);
    }
  };

  //add time slot modal
  const prevMainMonth = () => {
  const d = new Date(mainMonthDate);
  d.setMonth(d.getMonth() - 1);
  setMainMonthDate(d);
  };
  const nextMainMonth = () => {
  const d = new Date(mainMonthDate);
  d.setMonth(d.getMonth() + 1);
  setMainMonthDate(d);
  };

  const prevSlotMonth = () => {
  const d = new Date(slotMonthDate);
  d.setMonth(d.getMonth() - 1);
  setSlotMonthDate(d);
  };
  const nextSlotMonth = () => {
  const d = new Date(slotMonthDate);
  d.setMonth(d.getMonth() + 1);
  setSlotMonthDate(d);
  };

  const isValidTimeRange = (v) => {
    const re =
      /^\d{1,2}([:.]\d{2})\s?(am|pm)\s?-\s?\d{1,2}([:.]\d{2})\s?(am|pm)$/i;
    return re.test(String(v || "").trim());
  };

  const submitSlot = async () => {
    try {
      setSlotError("");
      setSlotSaving(true);

      if (!profile) {
        setSlotError("Tutor profile not found.");
        return;
      }

      if (!slotSelectedDate) {
        setSlotError("Please select a date.");
        return;
      }

      const tr = timeRange.trim();
      if (!tr) {
        setSlotError("Please enter a time range.");
        return;
      }

      if (!isValidTimeRange(tr)) {
        setSlotError('Time range must look like "4:00 pm - 5:00 pm".');
        return;
      }


      const selectedKey = toDateKey(slotSelectedDate);

      const dup = (slots || []).some((s) => {
        const slotKey = String(s.slotDate || "").slice(0, 10);
        const sameDate = slotKey === selectedKey;
        const sameRange = String(s.timeRange || "").toLowerCase() === tr.toLowerCase();
        return String(s.tutorId) === String(profile.id) && sameDate && sameRange;
      });


      if (dup) {
        setSlotError("This time slot already exists for the selected date.");
        return;
      }

      const now = new Date().toISOString();

      const slotDateIso = new Date(
        slotSelectedDate.getFullYear(),
        slotSelectedDate.getMonth(),
        slotSelectedDate.getDate(),
      12, 0, 0, 0
      ).toISOString();

      const payload = {
        tutorId: profile.id,
        slotDate: slotDateIso,
        timeRange: tr,
        isBooked: false,
        sessionId: null,
        createdAt: now,
        updatedAt: now,
      };

      await availabilitySlotsApi.create(payload);

      const slotsRes = await availabilitySlotsApi.getByTutorId(profile.id);
      setSlots(Array.isArray(slotsRes.data) ? slotsRes.data : []);

      window.alert("Time slot added successfully!");

      setTimeRange("");
      setSlotOpen(false);
    } catch (e) {
      setSlotError(e.message || "Failed to add time slot.");
    } finally {
      setSlotSaving(false);
    }
  };


  //loadint ui state
  if (loading) {
    return (
      <div className="tutorPage">
        <div className="tutorHeader">
          <button className="backArrow" onClick={goBack} aria-label="Back">
            ←
          </button>
          <div className="headerTitle">{headerTitle}</div>
          <div className="headerRight" />
        </div>

        <div className="centerBox">
          <Spinner label="Loading profile..." />
        </div>
      </div>
    );
  }

  //error ui state
  if (pageError) {
    return (
      <div className="tutorPage">
        <div className="tutorHeader">
          <button className="backArrow" onClick={goBack} aria-label="Back">
            ←
          </button>
          <div className="headerTitle">{headerTitle}</div>
          <div className="headerRight" />
        </div>

        <div className="centerBox">
          <div className="pageError">{pageError}</div>
          <Button variant="secondary" onClick={goBack}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  //  empty state
  if (!profile) {
    return (
      <div className="tutorPage">
        <div className="tutorHeader">
          <button className="backArrow" onClick={goBack} aria-label="Back">
            ←
          </button>
          <div className="headerTitle">{headerTitle}</div>
          <div className="headerRight" />
        </div>

        <div className="centerBox">
          <div className="emptyState">Profile not found.</div>
          <Button variant="secondary" onClick={goBack}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  // default ui state
  return (
    <div className="tutorPage">
      <div className="tutorHeader">
        <button className="backArrow" onClick={goBack} aria-label="Back">
          ←
        </button>

        <div className="headerTitle">{headerTitle}</div>

        <div className="headerRight headerBtnRow">
          {showTutorButtons ? (
            <>
              <Button
                className="topBtn"
                onClick={() => {
                  setSlotSelectedDate(mainSelectedDate);
                  setSlotMonthDate(mainMonthDate);
                  setSlotOpen(true);
                }}
              >
                Add time slots
              </Button>

              <Button className="topBtn" onClick={goEdit}>
                Edit profile
              </Button>
            </>
          ) : null}

          {showTuteeButtons ? (
            <>
              <Button className="topBtn" onClick={() => setRateOpen(true)}>
                Rate tutor
              </Button>
              <Button className="topBtn" onClick={goBookNow}>
                Book now
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="topGrid">
        <div className="tutorLeftCard">
          <div className="avatarCircle">{getInitials(profile.username)}</div>
          <div className="leftName">{profile.username}</div>

          <div className="leftMid">
            <div className="leftSchool">{profile.schoolName}</div>
            <div className="leftGpa">GPA: {profile.gpa ? `${profile.gpa}/4.0` : "—"}</div>
          </div>
        </div>

        <div className="tutorRightCol">
          <div className="tutorInfoCard">
            <div className="teachRow">
              <span>
                I teach{" "}
                {Array.isArray(profile.yearLevelsToTeach) && profile.yearLevelsToTeach.length
                  ? profile.yearLevelsToTeach.join(", ")
                  : "—"}
              </span>
              <span className="divider">|</span>
              <span>
                I use{" "}
                {profile.teachingStyle ? profile.teachingStyle.toLowerCase() : "—"} learning!
              </span>
            </div>

            <div className="infoSectionTitle">How I teach</div>
            <div className="infoText">
              {profile.descriptionTeachApproach ? profile.descriptionTeachApproach : "—"}
            </div>
          </div>

          <div className="tutorInfoPlain">
            <div className="infoSectionTitle">What I can help with</div>
            {Array.isArray(profile.modulesAbleToTeach) && profile.modulesAbleToTeach.length ? (
              <div className="chipWrap">
                {profile.modulesAbleToTeach.map((m, idx) => (
                  <span className="chipYellow" key={`${m}-${idx}`}>
                    {m}
                  </span>
                ))}
              </div>
            ) : (
              <div className="emptyInline">No modules added yet.</div>
            )}

            <div className="infoSectionTitle">Availability</div>
            <div className="infoText">
              {Array.isArray(profile.availableDays) && profile.availableDays.length
                ? profile.availableDays.join(", ")
                : "—"}
            </div>

            <div className="infoSectionTitle">Session durations</div>
            <div className="infoText">
              {Array.isArray(profile.sessionDurationMinutes) && profile.sessionDurationMinutes.length
                ? profile.sessionDurationMinutes
                    .map((n) => `${n} min`)
                    .join(", ")
                : "—"}
            </div>

            <div className="infoSectionTitle">Bio</div>
            <div className="infoText">{profile.shortBio ? profile.shortBio : "—"}</div>
          </div>
        </div>
      </div>

      <div className="statsRow">
        <div className="statCard">
          <div className="statLabel">Rating:</div>
          <div className="statValue">
            {starsText(Math.round(Number(profile.averageRating || 0)))}
          </div>
        </div>

        <div className="statCard">
          <div className="statLabel">Sessions tutored:</div>
          <div className="statValue">{Number(profile.completedSessionsCount || 0)}</div>
        </div>

        <div className="statCard">
          <div className="statLabel">Completion rate:</div>
          <div className="statValue">{Number(profile.attendanceRate ?? 0).toFixed(0)}%</div>
        </div>

        <div className="statCard">
          <div className="statLabel">Points earned:</div>
          <div className="statValue">{pointsEarned}</div>
        </div>
      </div>

      <div className="slotsHeader">
        <div className="slotsTitle">Time slots</div>
      </div>

      <div className="slotsSection">
        <div className="slotsInner">
          <MonthCalendar
            monthDate={mainMonthDate}
            selectedDate={mainSelectedDate}
            onSelectDate={(d) => setMainSelectedDate(d)}
            onPrevMonth={prevMainMonth}
            onNextMonth={nextMainMonth}
          />

          <div className="slotChipsRow">
            {slotsForSelectedDate.length ? (
              slotsForSelectedDate.map((s) => (
                <div className="slotChip" key={s.id}>
                  {s.timeRange}
                </div>
              ))
            ) : (
              <div className="emptyInline">
                No available slots for {formatSelectedDateLabel(mainSelectedDate)}.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="reviewsSection">
        <div className="reviewsHeaderRow">
          <div className="reviewsTitle">What others say</div>
          <div className="reviewsCount">{Number(profile.totalRatings || reviews.length)} Reviews</div>
        </div>

        {reviews.length ? (
          <div className="reviewsScroller">
            {reviews.map((r) => {
              const canManage = viewer && String(viewer.id) === String(r.tuteeId);

              return (
                <ReviewCard
                  key={r.id}
                  name={reviewerName(r)}
                  rating={r.rating}
                  comment={r.comment}
                  createdAt={r.createdAt}
                  canManage={canManage}
                  onEdit={() => openEditReview(r)}
                  onDelete={() => openDeleteReview(r)}
                />
              );
            })}

          </div>
        ) : (
          <div className="emptyInline">No reviews yet.</div>
        )}
      </div>

      <div className="badgesSection">
        <div className="badgesHeaderRow">
          <div className="badgesTitle">Badges earned</div>
        </div>

        {badgeObjects.length ? (
          <div className="badgesScroller">
            {badgeObjects.map((b) => (
              <BadgeCard key={b.badgeKey} badge={b} />
            ))}
          </div>
        ) : (
          <div className="emptyInline">No badges earned yet.</div>
        )}
      </div>

      <Modal
        title={profile ? `Rate ${profile.username}` : "Rate tutor"}
        open={rateOpen}
        onClose={() => {
          setRateOpen(false);
          setRateError("");
        }}
      >
        <div className="modalSectionTitle">Rate your tutor!</div>

        <StarRating value={rateValue} onChange={setRateValue} />

        <div style={{ marginTop: 18 }} />

        <TextField
          label="Write a review"
          name="rateComment"
          multiline
          rows={3}
          value={rateComment}
          onChange={(e) => setRateComment(e.target.value)}
          placeholder="Write a short comment..."
          error={rateError}
        />


        <div className="modalActions">
          <Button onClick={submitRating} disabled={rateSaving} className="modalSubmitBtn">
            {rateSaving ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </Modal>

      <Modal
        title="Add your time slots"
        open={slotOpen}
        onClose={() => {
          setSlotOpen(false);
          setSlotError("");
        }}
      >
        <div className="modalCalendarWrap">
          <MonthCalendar
            monthDate={slotMonthDate}
            selectedDate={slotSelectedDate}
            onSelectDate={(d) => setSlotSelectedDate(d)}
            onPrevMonth={prevSlotMonth}
            onNextMonth={nextSlotMonth}
          />
        </div>


        <div className="selectedDateText">
          Date selected: {formatSelectedDateLabel(slotSelectedDate)}
        </div>

        <TextField
          label="Available time range"
          name="timeRange"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          placeholder="e.g. 12:00 pm - 1:00 pm"
          error={slotError}
        />


        <div className="modalActions">
          <Button onClick={submitSlot} disabled={slotSaving} className="modalSubmitBtn">
            {slotSaving ? "Adding..." : "Add"}
          </Button>
        </div>
      </Modal>

      <Modal
        title="Edit your review"
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditError("");
        }}
      >
        <div className="modalSectionTitle">Update your rating</div>

        <StarRating value={editValue} onChange={setEditValue} />

        <div style={{ marginTop: 18 }} />

        <TextField
          label="Edit your review"
          name="editComment"
          multiline
          rows={3}
          value={editComment}
          onChange={(e) => setEditComment(e.target.value)}
          placeholder="Update your comment..."
          error={editError}
        />

        <div className="modalActions">
          <Button
            onClick={submitEditReview}
            disabled={editSaving}
            className="modalSubmitBtn"
          >
            {editSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </Modal>

      <Modal
        title="Delete review?"
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteError("");
        }}
      >
        <div className="deleteModalBody">
          <div className="modalSectionTitle deleteModalTitle">
            This action is permanent
          </div>

          <div className="infoText deleteModalText">
            Are you sure you want to delete your review? Once deleted, it cannot be recovered.
          </div>

          {deleteError ? (
            <div className="pageError" style={{ marginTop: 10 }}>
              {deleteError}
            </div>
          ) : null}

          <div className="deleteModalActions">
            <button
              type="button"
              className="deleteBtn deleteBtn-cancel"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteSaving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="deleteBtn deleteBtn-delete"
              onClick={confirmDeleteReview}
              disabled={deleteSaving}
            >
              {deleteSaving ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TutorProfilePage;

