import { Link } from "react-router-dom";
import Header from "@/components/Header";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl py-10 prose prose-invert">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: May 11, 2026</p>

        <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Plate N' State, you agree to be bound by these Terms of Service.
              If you do not agree, do not use the platform.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials.
              You must be at least 18 years old to create an account and submit reports.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Acceptable Use</h2>
            <p>
              You may not use Plate N' State to post false information, harass individuals, or
              submit reports motivated by personal vendettas rather than genuine road safety concerns.
              All reports must be based on firsthand observation.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Content & Reports</h2>
            <p>
              By submitting a report, you grant Plate N' State a license to display the content
              publicly. Reporter identities are anonymized after 30 days. We reserve the right to
              remove content that violates these terms.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Plate Claims & Disputes</h2>
            <p>
              Claimed plates must be verified by the actual registered owner. Dispute submissions
              are reviewed by our moderation team. Frivolous or fraudulent disputes may result in
              account suspension.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Termination</h2>
            <p>
              We may suspend or terminate your account for violations of these terms, abuse of the
              platform, or fraudulent activity. You may delete your account at any time from your
              Profile page.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Disclaimer</h2>
            <p>
              Plate N' State is a community platform and not a government agency. Report data is
              crowdsourced and not verified by law enforcement. Use the platform at your own risk.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Release of Liability & Assumption of Risk</h2>
            <p className="mb-2">
              TO THE FULLEST EXTENT PERMITTED BY LAW, by using Plate N' State you (the "User")
              hereby RELEASE, WAIVE, DISCHARGE, AND COVENANT NOT TO SUE Plate N' State, its
              owners, operators, officers, employees, contractors, agents, affiliates, and
              licensors (collectively, the "Released Parties") from any and all liability,
              claims, demands, actions, or causes of action whatsoever, whether known or unknown,
              arising out of or related to your use of the platform, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-2">
              <li>Content submitted, viewed, or relied upon on the platform, including reports, comments, photos, and plate data, whether accurate or inaccurate;</li>
              <li>Any interaction, dispute, confrontation, harassment, retaliation, property damage, bodily injury, emotional distress, or death arising between Users or third parties as a result of platform activity;</li>
              <li>Decisions made based on risk scores, safety scores, screenings, or any other data presented through the platform;</li>
              <li>Use of the camera, scanning, or ALPR features, including any incident occurring while the User is operating a motor vehicle in violation of the passenger-only acknowledgment;</li>
              <li>Defamation, invasion of privacy, or reputational harm claims arising from User-submitted content;</li>
              <li>Service interruptions, data loss, unauthorized access, or security incidents.</li>
            </ul>
            <p className="mb-2">
              The User expressly assumes all risks associated with using Plate N' State and
              acknowledges that the platform is provided "AS IS" and "AS AVAILABLE" without
              warranties of any kind, express or implied. The Released Parties shall not be
              liable for any direct, indirect, incidental, consequential, special, exemplary,
              or punitive damages, even if advised of the possibility of such damages.
            </p>
            <p className="mb-2">
              The User agrees to INDEMNIFY, DEFEND, AND HOLD HARMLESS the Released Parties from
              any third-party claims, losses, liabilities, damages, costs, or expenses
              (including reasonable attorneys' fees) arising out of the User's submissions,
              conduct, or breach of these Terms.
            </p>
            <p>
              This release is intended to be as broad and inclusive as permitted by applicable
              law. If any portion is held invalid, the remainder shall continue in full legal
              force and effect. The User acknowledges they have read this release, understand
              it, and accept it voluntarily by using the platform.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Continued use after changes constitutes
              acceptance of the revised terms.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">10. Contact</h2>
            <p>
              Questions about these terms: <a className="text-primary" href="mailto:legal@platenstate.com">legal@platenstate.com</a>
            </p>
          </div>
        </section>

        <div className="mt-10">
          <Link to="/" className="text-primary text-sm">← Back to home</Link>
        </div>
      </main>
    </div>
  );
};

export default Terms;
