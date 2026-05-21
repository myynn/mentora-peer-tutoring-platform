
import Modal from "./Modal";
import "../styles/settingsPage.css";

const ConfirmDeleteAccountModal = ({ open, onClose, onConfirm, loading }) => {
  return (
    <Modal title="Delete account" open={open} onClose={onClose}>
      <div className="setModalText">
        <div className="setModalWarning">
          This action is permanent. Your account will be deleted and you will not be able to recover it.
        </div>

        <div className="setModalQuestion">
          Are you sure you want to delete your account?
        </div>
      </div>

      <div className="setModalBtns">
        <button type="button" className="setBtnGhost" onClick={onClose} disabled={loading}>
          Cancel
        </button>

        <button type="button" className="setBtnDanger" onClick={onConfirm} disabled={loading}>
          {loading ? "Deleting..." : "Confirm delete"}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteAccountModal;