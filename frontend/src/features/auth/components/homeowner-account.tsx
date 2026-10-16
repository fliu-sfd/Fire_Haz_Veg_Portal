"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import {
  authErrorMessage,
  getCurrentAccount,
  signOut,
  type Account,
} from "@/features/auth/api";

export function HomeownerAccount() {
  const router = useRouter();
  const [account, setAccount] = useState<Account>();
  const [error, setError] = useState<string>();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentAccount()
      .then((current) => {
        if (!active) return;
        if (current.role !== "resident") {
          router.replace("/dashboard");
          return;
        }
        setAccount(current);
      })
      .catch((reason: unknown) => {
        if (active) setError(authErrorMessage(reason));
      });
    return () => { active = false; };
  }, [router]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace("/sign-in");
    } catch (reason) {
      setError(authErrorMessage(reason));
      setIsSigningOut(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl">
        <FormAlert variant="error" title="We could not load your account">{error}</FormAlert>
        <Button onClick={() => router.replace("/sign-in")} className="mt-5">Return to sign in</Button>
      </div>
    );
  }

  if (!account) {
    return <p role="status" className="text-center text-city-dark">Loading your property account…</p>;
  }

  return (
    <section className="mx-auto max-w-4xl overflow-hidden rounded border border-city-light bg-white shadow-[0_12px_32px_rgba(26,35,40,0.1)]">
      <div className="border-l-4 border-denim p-7 sm:p-12">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-civic-blue">Homeowner portal</p>
            <h1 className="mt-3 text-4xl font-light tracking-tight text-charcoal">Welcome, {account.fullName}</h1>
            <p className="mt-3 text-city-dark">{account.email}</p>
          </div>
          <Button variant="secondary" disabled={isSigningOut} onClick={handleSignOut}>
            {isSigningOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>

        <div className="mt-10 border-t border-city-light pt-8">
          <h2 className="text-2xl font-light text-charcoal">Connected properties</h2>
          <p className="mt-2 leading-7 text-city-dark">These Asset IDs were verified against the City assessment data.</p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {account.propertyIds.map((assetId) => (
              <li key={assetId} className="rounded border border-city-light bg-city-gray p-4">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-civic-blue">Asset ID</span>
                <span className="mt-1 block text-lg font-semibold text-charcoal">{assetId}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
