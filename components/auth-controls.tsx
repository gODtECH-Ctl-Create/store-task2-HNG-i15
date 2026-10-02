"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth/client";

export function AuthControls() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <span className="auth-loading">...</span>;
  }

  if (!session?.user) {
    return (
      <Link className="auth-link" href="/auth/sign-in">
        Sign in
      </Link>
    );
  }

  return (
    <div className="auth-controls">
      <Link className="auth-link" href="/account/settings">
        {session.user.name || session.user.email}
      </Link>
      <button className="auth-signout" type="button" onClick={() => authClient.signOut()}>
        Sign out
      </button>
    </div>
  );
}
