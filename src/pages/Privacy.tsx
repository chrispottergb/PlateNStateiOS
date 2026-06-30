import { Link } from "react-router-dom";
import Header from "@/components/Header";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl py-10 prose prose-invert">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: June 30, 2026</p>

        <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. What we collect</h2>
            <p>
              When you create an account we store your email address, a display name, and gameplay
              metadata (XP, badges, streaks, credits). If you sign in with Google, we receive your
              email address and basic profile information (name and avatar) from Google. When you
              submit a report we store the license plate, state, infraction type, free-text comment,
              an approximate location, and—if you choose to add it—a perceived driver description
              (age band + gender). We also record when you accept our Terms of Service (the timestamp
              and which version you agreed to).
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Camera & plate photos</h2>
            <p>
              When you scan a plate with your camera, the captured image is sent transiently to
              Anthropic (<code>api.anthropic.com</code>) to read the plate text (OCR). The image is
              processed in real time, returned to the app, and then discarded—it is{" "}
              <strong>not stored</strong> on our servers and is{" "}
              <strong>not used to train any AI model</strong>. Only the resulting plate characters
              you confirm are saved as part of a report.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. IP address</h2>
            <p>
              When you submit a report we determine your public IP address (via{" "}
              <code>ipify.org</code>) and store it alongside the report for abuse prevention and to
              enforce rate limits. The copy held in our short-lived rate-limit buckets is purged
              within roughly one hour.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Location precision</h2>
            <p>
              GPS coordinates attached to reports are rounded to ~1 km precision (2 decimal places)
              before storage. We never retain street-level coordinates, even if your device shares them.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Reporter anonymization</h2>
            <p>
              The link between a report and its author (<code>reporter_id</code>) is automatically
              cleared 30 days after the report is created. After that window, reports remain visible
              but cannot be traced back to an individual account.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Sensitive fields</h2>
            <p>
              Optional fields such as the perceived driver description (age band + gender) are stored
              only for moderation review and are not exposed to other users or to the public API.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Payments</h2>
            <p>
              Purchases and subscriptions are processed by Stripe. Your card details are entered
              directly with Stripe and are never seen or stored by us—we only store your
              purchase/subscription status so we can grant the features you bought.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Notifications & rate limits</h2>
            <p>
              Read notifications are purged after 90 days. Rate-limit IP buckets are purged after 1
              hour. We do not sell or share your data with third-party advertisers.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Third-party services & sub-processors</h2>
            <p>
              We rely on the following providers to operate the app:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Supabase</strong> — database storage and authentication.</li>
              <li><strong>Anthropic</strong> — transient plate-image reading (OCR); images are not stored or used for training.</li>
              <li><strong>Stripe</strong> — payment and subscription processing.</li>
              <li><strong>Google</strong> — optional Google sign-in (email + basic profile).</li>
              <li><strong>ipify</strong> — public IP lookup for abuse prevention.</li>
              <li><strong>hCaptcha</strong> — bot prevention.</li>
              <li><strong>Sentry</strong> — crash and diagnostics monitoring. Session Replay is disabled, so we do not record your screen.</li>
              <li><strong>OpenStreetMap / Nominatim</strong> — geocoding.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">10. Your rights & account deletion</h2>
            <p>
              You can request deletion of your account at{" "}
              <a className="text-primary" href="/delete-account">/delete-account</a> (also reachable
              at <a className="text-primary" href="/data-deletion">/data-deletion</a>). Deletion
              requests are processed within 30 days and remove your profile, claimed plates, and
              notifications. Reports you submitted remain published but become anonymous.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">11. Contact</h2>
            <p>
              Questions or data requests: <a className="text-primary" href="mailto:support@platenstate.com">support@platenstate.com</a>
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

export default Privacy;
