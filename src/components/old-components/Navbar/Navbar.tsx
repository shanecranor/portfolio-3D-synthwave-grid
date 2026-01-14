import "./Navbar.scss";
import Link from "next/link";
const navbarLinks = {
  Home: "/",
  Code: "/code",
  Music: "/music",
  Photos: "https://shane.cranor.org/Photos/index.html",
};
export default function Navbar() {
  return (
    <nav className="navbar-container">
      {Object.entries(navbarLinks).map(([text, url]) => (
        <Link href={url} key={text} className="nav-link">
          {text}
        </Link>
      ))}
    </nav>
  );
}
