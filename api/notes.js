// api/notes.js
import { admin, db } from "../src/config/firebaseAdmin";

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!idToken) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userId = decoded.uid;

    const notesSnapshot = await db
      .collection("notes")
      .where("userId", "==", userId)
      .get();
    const notes = notesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ notes });
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
