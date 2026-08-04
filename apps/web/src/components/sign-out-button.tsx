"use client";

import { useAuth } from "@/providers/auth-provider";
import { Button } from "@ghost/ui";

export function SignOutButton() {
  const { signOut } = useAuth();

  return (
    <Button variant="ghost" size="sm" onClick={() => void signOut()}>
      Salir
    </Button>
  );
}
