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
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Continued use after changes constitutes
              acceptance of the revised terms.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Contact</h2>
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
