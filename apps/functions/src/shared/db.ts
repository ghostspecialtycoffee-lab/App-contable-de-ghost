import { getFirestore } from "firebase-admin/firestore";

let db: FirebaseFirestore.Firestore | undefined;

export function getDb() {
  if (!db) {
    db = getFirestore();
  }

  return db;
}
