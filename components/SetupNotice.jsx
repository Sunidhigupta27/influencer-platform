import Link from "next/link";

/* Shown instead of a crash when .env.local has no Firebase keys. */
export default function SetupNotice() {
  return (
    <div className="auth-wrap">
      <section className="panel">
        <h1>Firebase isn&apos;t connected yet</h1>
        <p className="sub">
          Log in, sign up and the dashboards need your Firebase keys. The homepage works
          without them.
        </p>
        <ol className="setup-steps">
          <li>
            Open <strong>.env.local</strong> in the project folder.
          </li>
          <li>
            Paste the values from Firebase console → Project settings → Your apps → Web app.
          </li>
          <li>
            Stop the server (Ctrl + C) and run <code>npm run dev</code> again.
          </li>
        </ol>
        <Link href="/" className="btn btn-violet btn-block">
          Back to homepage
        </Link>
      </section>
    </div>
  );
}
