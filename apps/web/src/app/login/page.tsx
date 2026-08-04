"use client";

import Link from "next/link";
import { useState } from "react";

import { getFirebaseAuth } from "@/lib/firebase/client";
import { Button, Card } from "@ghost/ui";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "/dashboard";
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "No fue posible iniciar sesión.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card
        title="Acceso"
        description="Autenticación con Firebase. Configura las variables de entorno antes de usar en producción."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Correo</span>
            <input
              type="email"
              required
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
          <Link href="/" className="underline">
            Volver al inicio
          </Link>
        </p>
      </Card>
    </div>
  );
}
