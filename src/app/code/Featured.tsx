import "./Featured.scss";
import syllabuddiesImg from "@/public/assets/project-images/syllabuddies.png";
import patientPortalImg from "@/public/assets/project-images/patient-portal.png";
import minesRocksImg from "@/public/assets/project-images/mines-rocks.png";
import spinWheelImg from "@/public/assets/project-images/spin-wheel.png";
import { ProjectTags } from "@/components/ProjectTags/ProjectTags";
import { projects } from "@/data/projects";
export const Featured = () => {
  return (
    // <Section header="Featured Projects" startOpen={true}>
    <div className="featured-container">
      <article>
        <img src={patientPortalImg.src} alt="Patient Portal" />
        <div className="text">
          <h3>Patient Portal</h3>
          <p>
            A patient portal for requesting prescription refills and viewing
            prescription history, shipments, receipts and more. Used in
            production by over 40,000 patients
          </p>
          <ProjectTags
            languages={
              projects.find((proj) => proj.title === "Patient Portal")
                ?.languages || []
            }
          />
        </div>
      </article>
      <article>
        <div className="text">
          <h3>Spin the Wheel</h3>
          <p>
            A realtime serverless minigame for use on live streams as a
            Truffle.vip app. Viewers submit text entries that can be aproved or
            rejected by mods in the moderator dashboard.
          </p>
          <ProjectTags
            languages={
              projects.find((proj) => proj.title === "Spin the Wheel")
                ?.languages || []
            }
          />
        </div>
        {/* <img src={spinWheelImg.src} alt="Spin the Wheel" />
         */}
        <div className="iframe-container">
          <iframe
            src="https://serverless-less.wheel-spin.pages.dev/"
            width="500px"
            height="650px"
            title="Spin the Wheel"
          />
        </div>
      </article>
      <article className="flip">
        <div className="text">
          <h3>mines.rocks</h3>
          <p>
            A platform for data driven course selection. The site shows average
            grades on a per course, and per assignment level, and is designed to
            help students choose classes that match their learning style.
          </p>
          <ProjectTags
            languages={
              projects.find((proj) => proj.title === "mines.rocks")
                ?.languages || []
            }
          />
        </div>
        <div className="spacer" />
        <img src={minesRocksImg.src} alt="mines.rocks" />
      </article>
      {/* <article>
        <div className="text">
          <h3>Syllabuddies</h3>
          <p>
            Crowd sourced syllabi sharing site for the Colorado School of Mines.
          </p>
          <ProjectTags
            languages={
              projects.find((proj) => proj.title === "Syllabuddies")
                ?.languages || []
            }
          />
        </div>
        <img src={syllabuddiesImg.src} alt="Syllabuddies" />
      </article> */}
    </div>
    // </Section>
  );
};
