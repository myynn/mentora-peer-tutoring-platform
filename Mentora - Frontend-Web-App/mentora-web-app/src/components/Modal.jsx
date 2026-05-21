import { useEffect } from "react";
import "../styles/tutorProfile.css";

const Modal = ({ title, open, onClose, children }) => {

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <div className="modalCard">
        <div className="modalHeader">
          <div className="modalTitle">{title}</div>
          <button className="modalCloseBtn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modalBody">{children}</div>
      </div>

      <button className="modalBackdropBtn" onClick={onClose} aria-label="Close modal background" />
    </div>
  );
};

export default Modal;
