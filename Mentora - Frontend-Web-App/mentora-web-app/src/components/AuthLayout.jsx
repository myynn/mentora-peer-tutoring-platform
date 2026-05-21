
import "../styles/auth.css";
import logoImg from "../assets/mentora-loginpage.png";

export default function AuthLayout({ children }) {
  return (
    <div className="authPage">
      <div className="authCard">

        <div className="authLeft">
          <img className="authImage" src={logoImg} alt="Mentora" />
          <div className="brandTitle">Mentora</div>
          <div className="brandSlogan">Because peers understand best.</div>
        </div>

        <div className="authRight">{children}</div>
      </div>
    </div>
  );
}
