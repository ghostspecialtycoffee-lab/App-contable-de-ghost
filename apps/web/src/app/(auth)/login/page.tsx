"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";

import { getAuthErrorMessage } from "@/lib/auth/errors";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Button, Card } from "@ghost/ui";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      router.replace(nextPath);
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card
        title="Acceso"
        description="Inicia sesión con tu cuenta Ghost ERP."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
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
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-0)] px-3 py-2 text-sm outline-none ring-[var(--ghost-brand-500)] focus:ring-2"
            />
          </label>
          {error ? (
            <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
          ) : null}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-[var(--ghost-text-muted)]">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="underline">
            Regístrate
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm">Cargando...</p>}>
      <LoginForm />
    </Suspense>
  );
}
