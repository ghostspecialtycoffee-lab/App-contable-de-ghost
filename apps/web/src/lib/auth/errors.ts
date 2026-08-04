import type { User } from "firebase/auth";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-email": "El correo electrónico no es válido.",
  "auth/user-disabled": "Esta cuenta está deshabilitada.",
  "auth/user-not-found": "No existe una cuenta con ese correo.",
  "auth/wrong-password": "Contraseña incorrecta.",
  "auth/invalid-credential": "Credenciales inválidas.",
  "auth/email-already-in-use": "Ese correo ya está registrado.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/too-many-requests": "Demasiados intentos. Intenta más tarde.",
  "auth/network-request-failed": "Error de red. Verifica tu conexión.",
};

export function getAuthErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return AUTH_ERROR_MESSAGES[error.code] ?? "Ocurrió un error de autenticación.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}

const FIRESTORE_ERROR_MESSAGES: Record<string, string> = {
  "permission-denied":
    "Permisos insuficientes en Firestore. Recarga la página; si persiste, contacta al administrador.",
  unavailable: "Firestore no está disponible. Intenta en unos minutos.",
};

export function getFirestoreErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    const code = error.code.replace("firestore/", "");
    return (
      FIRESTORE_ERROR_MESSAGES[code] ??
      ("message" in error && typeof error.message === "string" && error.message
        ? error.message
        : "No fue posible acceder a los datos.")
    );
  }

  return getAuthErrorMessage(error);
}

export function getCallableErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    if (error.code.startsWith("firestore/")) {
      return getFirestoreErrorMessage(error);
    }

    const code = error.code.replace("functions/", "");
    const messages: Record<string, string> = {
      unauthenticated: "Debes iniciar sesión.",
      "already-exists": "Ese identificador ya está en uso.",
      "invalid-argument": "Revisa los datos ingresados.",
      "failed-precondition": "No puedes completar esta acción en este momento.",
      internal:
        "El servidor no está listo. Falta desplegar Cloud Functions (plan Blaze + deploy).",
      "not-found":
        "Función no encontrada. El backend aún no está desplegado en Firebase.",
      unavailable: "Servicio temporalmente no disponible. Intenta en unos minutos.",
    };

    if (code === "internal" || code === "not-found") {
      return messages[code] ?? "El backend no está desplegado. Contacta al administrador.";
    }

    if ("message" in error && typeof error.message === "string" && error.message) {
      if (error.message === "internal") {
        return messages.internal ?? "El backend no está desplegado.";
      }
      return error.message;
    }

    return messages[code] ?? "No fue posible completar la operación.";
  }

  return getAuthErrorMessage(error);
}

export type AuthUser = User;
