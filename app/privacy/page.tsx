export const metadata = { title: "Privacy — Voice Memory Album" };

export default function PrivacyPage() {
  return (
    <main className="relative z-10 mx-auto w-full max-w-md flex-1 px-6 py-10 text-[15px] leading-relaxed">
      <h1 className="font-display text-3xl font-semibold mb-6">Privacy Policy</h1>
      <p className="text-ink-soft text-sm mb-6">Last updated: 19 July 2026</p>

      <section className="space-y-4">
        <p>
          Voice Memory Album is a small, family-focused app for keeping voice memories of
          the people and moments you love. Your memories belong to you. This page explains
          plainly what we store and why.
        </p>

        <h2 className="font-display text-xl font-semibold pt-2">What we store</h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Your email address and a securely hashed password (never the password itself).</li>
          <li>The album names and start dates you enter (often a child&rsquo;s name and birth date) — used only to organize the albums.</li>
          <li>
            The content you create: voice recordings, their transcripts, the AI-written
            titles and summaries, and the photos you upload.
          </li>
        </ul>

        <h2 className="font-display text-xl font-semibold pt-2">Where it lives</h2>
        <p>
          Data is stored with our hosting providers: Vercel (application and file
          storage) and Neon (database). Voice notes are sent to Google&rsquo;s Gemini API
          once, to be transcribed and summarized, and are not used to train models per
          Google&rsquo;s paid/API data policies.
        </p>

        <h2 className="font-display text-xl font-semibold pt-2">What we never do</h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>No advertising, no trackers, no analytics profiles.</li>
          <li>We never sell or share your data with anyone.</li>
          <li>
            Nobody can see your album except the accounts you invite with an invite code.
          </li>
        </ul>

        <h2 className="font-display text-xl font-semibold pt-2">Deletion</h2>
        <p>
          You can delete any memory (recording, transcript, photos) in the app at any
          time. To delete your entire account and all data, email us and we&rsquo;ll do it
          promptly.
        </p>

        <h2 className="font-display text-xl font-semibold pt-2">Contact</h2>
        <p>
          Questions or deletion requests:{" "}
          <a href="mailto:szigalkina@gmail.com" className="underline underline-offset-2">
            szigalkina@gmail.com
          </a>
        </p>
      </section>
    </main>
  );
}
