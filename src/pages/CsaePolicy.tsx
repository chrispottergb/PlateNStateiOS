import { Link } from "react-router-dom";
import Header from "@/components/Header";

const CsaePolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl py-10 prose prose-invert">
        <h1 className="text-3xl font-bold mb-2">Child Sexual Abuse and Exploitation (CSAE) Policy</h1>
        <p className="text-sm text-muted-foreground mb-1">Plate N' State</p>
        <p className="text-sm text-muted-foreground mb-8">
          Last Updated: May 2026 · Effective immediately upon publication · Policy Version 1.0
        </p>

        <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Commitment to Safety</h2>
            <p>
              Plate N' State is committed to preventing child sexual abuse and exploitation (CSAE).
              We maintain zero tolerance for any content, conduct, or material that sexualizes,
              exploits, or harms children.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Our Approach</h2>
            <p className="mb-2">
              Plate N' State is a license plate reporting application. Users submit text-based
              reports of vehicle license plates in connection with traffic incidents, unsafe driving,
              or parking violations. Our platform does not:
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-2">
              <li>Store user-uploaded images or photographs</li>
              <li>Host user-generated video content</li>
              <li>Maintain messaging or chat functionality between users</li>
              <li>Create user profiles with personal information</li>
              <li>Allow file attachments or media uploads</li>
              <li>Support user comments or discussion threads on reports</li>
            </ul>
            <p>
              Because Plate N' State does not collect, store, or display user-generated media,
              images, or personal profiles, the primary vectors for CSAE material are substantially
              eliminated by design.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Content Monitoring and Reporting</h2>
            <h3 className="text-base font-semibold text-foreground mb-1">3.1 Text-Based Content Review</h3>
            <p className="mb-2">
              All user-submitted license plate reports are text-only entries. Our systems monitor for:
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>Sexually explicit language in report descriptions</li>
              <li>Solicitation or grooming language</li>
              <li>Child exploitation references or coded language</li>
              <li>Attempts to use the platform for purposes other than vehicle reporting</li>
            </ul>
            <h3 className="text-base font-semibold text-foreground mb-1">3.2 Automated Detection</h3>
            <p className="mb-2">
              We employ automated text filtering to detect and flag content containing:
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>Known CSAE-related keywords and phrases</li>
              <li>Suspicious patterns indicating potential abuse</li>
              <li>Attempts to circumvent content policies</li>
            </ul>
            <p className="mb-3">
              Flagged reports are immediately removed from public view and reviewed by our trust
              and safety team.
            </p>
            <h3 className="text-base font-semibold text-foreground mb-1">3.3 Reporting Mechanism</h3>
            <p className="mb-2">Users can report suspected CSAE content through:</p>
            <ul className="list-disc pl-6 space-y-1 mb-2">
              <li>In-app reporting button on any license plate report</li>
              <li>
                Direct email:{" "}
                <a className="text-primary" href="mailto:support@platenstate.com">
                  support@platenstate.com
                </a>
              </li>
              <li>Reference to National Center for Missing &amp; Exploited Children (NCMEC) contact information</li>
            </ul>
            <p>All reports are reviewed within 24 hours.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Legal Compliance</h2>
            <h3 className="text-base font-semibold text-foreground mb-1">4.1 Mandatory Reporting</h3>
            <p className="mb-2">Any suspected CSAE content or activity is reported to:</p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>National Center for Missing &amp; Exploited Children (NCMEC)</li>
              <li>Appropriate law enforcement agencies</li>
              <li>Platform app stores (Apple App Store, Google Play Store)</li>
            </ul>
            <p className="mb-3">
              We maintain records of all reports and our responses for compliance verification.
            </p>
            <h3 className="text-base font-semibold text-foreground mb-1">4.2 Age Restrictions</h3>
            <p className="mb-3">
              Plate N' State requires users to be 16 years or older. We do not knowingly allow
              children under 13 to create accounts.
            </p>
            <h3 className="text-base font-semibold text-foreground mb-1">4.3 Data Retention</h3>
            <p>
              User-submitted reports are retained for 90 days for safety review purposes. After 90
              days, reports are archived and then permanently deleted unless required to be retained
              by law enforcement or legal process.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. User Education</h2>
            <p className="mb-2">
              We provide clear community guidelines at app launch and in settings that explain:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>What content is prohibited</li>
              <li>How to report abuse</li>
              <li>Consequences for policy violations</li>
              <li>Resources for users experiencing exploitation</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Team and Training</h2>
            <p className="mb-2">
              All team members with access to user content, safety reports, and moderation systems
              receive annual training on:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>CSAE recognition and reporting requirements</li>
              <li>Platform policies and enforcement procedures</li>
              <li>Legal obligations under FOSTA-SESTA and similar legislation</li>
              <li>De-escalation and user safety protocols</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Third-Party Partnerships</h2>
            <p>
              Plate N' State does not partner with third-party platforms that allow content uploads,
              messaging, or profile creation that would introduce CSAE vectors into our ecosystem.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Policy Updates</h2>
            <p className="mb-2">
              This policy is reviewed quarterly and updated as needed to reflect changes in:
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-2">
              <li>Legal requirements</li>
              <li>Best practices in platform safety</li>
              <li>Emerging threat vectors</li>
            </ul>
            <p>Policy changes will be communicated to users through in-app notifications.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Reference Resources</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <a
                  className="text-primary"
                  href="https://www.missingkids.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  National Center for Missing &amp; Exploited Children (NCMEC)
                </a>
              </li>
              <li>
                <a
                  className="text-primary"
                  href="https://support.google.com/googleplay/android-developer/answer/9888379"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Play Store CSAE Requirements
                </a>
              </li>
              <li>
                <a
                  className="text-primary"
                  href="https://report.cybertip.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  CyberTipline
                </a>
              </li>
              <li>
                <a
                  className="text-primary"
                  href="https://www.iwf.org.uk/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Internet Watch Foundation
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Contact Us</h2>
            <p className="mb-2">For questions about this policy or to report concerns:</p>
            <p className="mb-2">
              Email:{" "}
              <a className="text-primary" href="mailto:support@platenstate.com">
                support@platenstate.com
              </a>
            </p>
            <p>Mailing Address: 30 N Gould St Ste R, Sheridan, WY 82801</p>
          </div>
        </section>

        <div className="mt-10">
          <Link to="/" className="text-primary text-sm">← Back to home</Link>
        </div>
      </main>
    </div>
  );
};

export default CsaePolicy;
