"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

import { getAuthErrorMessage } from "@/lib/auth/errors";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Button, Card } from "@ghost/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password,
      );

      if (displayName.trim()) {
        await updateProfile(credential.user, { displayName: displayName.trim() });
      }

      router.replace("/onboarding");
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card
        title="Crear cuenta"
        description="Alta de usuario para acceso interno."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Nombre</span>
            <input
              type="text"
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-0)] px-3 py-2 text-sm outline-none ring-[var(--ghost-brand-500)] focus:ring-2"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Correo</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-0)] px-3 py-2 text-sm outline-none ring-[var(--ghost-brand-500)] focus:ring-2"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Contraseña</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-0)] px-3 py-2 text-sm outline-none ring-[var(--ghost-brand-500)] focus:ring-2"
            />
          </label>
          {error ? (
            <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
          ) : null}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-[var(--ghost-text-muted)]">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="underline">
            Inicia sesión
          </Link>
        </p>
      </Card>
    </div>
  );
}
