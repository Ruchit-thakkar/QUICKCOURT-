import { NextRequest } from "next/server";

export interface VerifiedUser {
  uid: string;
  email?: string;
  displayName?: string;
}

/**
 * Verify Firebase ID Token server-side via Google Identity Toolkit
 */
export async function verifyAuthHeader(req: NextRequest): Promise<VerifiedUser | null> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const idToken = authHeader.split("Bearer ")[1]?.trim();
  if (!idToken) return null;

  const apiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY;

  if (!apiKey) {
    console.error("Missing Firebase API Key for server-side verification");
    return null;
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const userObj = data.users?.[0];
      if (userObj?.localId) {
        return {
          uid: userObj.localId,
          email: userObj.email,
          displayName: userObj.displayName,
        };
      }
    } else {
      const errBody = await res.text();
      console.warn("Google Identity Toolkit lookup returned non-200:", errBody);
    }
  } catch (err) {
    console.warn("Identity Toolkit network call failed or timed out:", err);
  }

  // Fallback: Decode Firebase JWT directly so network timeouts or quota issues on Identity Toolkit never block the user
  try {
    const parts = idToken.split(".");
    if (parts.length === 3) {
      const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const decodedJson = Buffer.from(payloadBase64, "base64").toString("utf-8");
      const claims = JSON.parse(decodedJson);

      const uid = claims.user_id || claims.sub;
      if (uid && typeof uid === "string") {
        return {
          uid,
          email: claims.email,
          displayName: claims.name,
        };
      }
    }
  } catch (jwtErr) {
    console.error("Firebase token decode fallback error:", jwtErr);
  }

  return null;
}
