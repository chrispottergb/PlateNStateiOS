import { Link } from "react-router-dom";
import Header from "@/components/Header";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl py-10 prose prose-invert">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: May 4, 2026</p>

        <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. What we collect</h2>
            <p>
              When you create an account we store your email address, a display name, and gameplay
              metadata (XP, badges, streaks, credits). When you submit a report we store the license
              plate, state, infraction type, free-text comment, and an approximate location.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Location precision</h2>
            <p>
              GPS coordinates attached to reports are rounded to ~1 km precision (2 decimal places)
              before storage. We never retain street-level coordinates, even if your device shares them.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Reporter anonymization</h2>
            <p>
              The link between a report and its author (<code>reporter_id</code>) is automatically
              cleared 30 days after the report is created. After that window, reports remain visible
              but cannot be traced back to an individual account.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Sensitive fields</h2>
            <p>
              Optional fields such as observed driver gender are stored only for moderation review and
              are not exposed to other users or to the public API.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Notifications & rate limits</h2>
            <p>
              Read notifications are purged after 90 days. Rate-limit IP buckets are purged after 1
              hour. We do not sell or share your data with third-party advertisers.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Third-party services</h2>
            <p>
              We use Lovable Cloud (Supabase) for storage and authentication, hCaptcha for bot
              prevention, Sentry for error monitoring, and OpenStreetMap/Nominatim for geocoding.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Your rights</h2>
            <p>
              You may delete your account at any time from the Profile page. Account deletion removes
              your profile, claimed plates, and notifications. Reports you submitted remain published
              but become anonymous.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Contact</h2>
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
