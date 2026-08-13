//music page
import { PlaceholderImage } from "@/components/PlaceholderImage/PlaceholderImage";
import "./page.scss";
import Navbar from "@/components/old-components/Navbar/Navbar";
import Link from "next/link";
const Page = () => {
  return (
    <main className="p-photos">
      <Navbar />
      <h1>Photography</h1>
      <p style={{ maxWidth: "600px" }}>
        I love playing with old lenses and modern cameras. These days I take
        pictures of cute dog and whatever else happens to be interesting. I will
        update this page with more of my photography soon<sup>TM</sup>.
      </p>
      <div className="photos-placeholder">
        <PlaceholderImage seed="photos" />
      </div>
    </main>
  );
};

export default Page;
