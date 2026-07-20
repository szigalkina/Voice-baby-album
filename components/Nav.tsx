import Link from "next/link";

export default function Nav({ active }: { active: "journal" | "album" | "account" }) {
  const base = "flex-1 py-4 text-center label-caps transition-colors";
  const item = (href: string, key: string, text: string) => (
    <Link
      href={href}
      className={`${base} ${active === key ? "text-ink" : "text-ink-soft"}`}
    >
      {text}
      {active === key && <span className="block mx-auto mt-1 h-px w-6 bg-ink" />}
    </Link>
  );
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 pb-[env(safe-area-inset-bottom)] bg-bone/95 backdrop-blur border-t border-hairline">
      <div className="mx-auto max-w-md flex">
        {item("/", "journal", "Journal")}
        {item("/album", "album", "Album")}
        {item("/account", "account", "Account")}
      </div>
    </nav>
  );
}
