import { NextRequest, NextResponse } from "next/server";
import { verifyAuthHeader } from "@/lib/ai/authHelper";
import { getServerImageKitInstance } from "@/lib/imagekit";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user via Firebase ID Token
    const verifiedUser = await verifyAuthHeader(req);
    if (!verifiedUser) {
      return NextResponse.json(
        { error: "Unauthorized: Valid authentication token required." },
        { status: 401 }
      );
    }

    // 2. Parse JSON payload
    const body = await req.json();
    const businessId = body.businessId?.trim();
    const fileId = body.fileId?.trim();

    if (!fileId) {
      return NextResponse.json(
        { error: "fileId is required to delete an image." },
        { status: 400 }
      );
    }

    if (!businessId) {
      return NextResponse.json(
        { error: "businessId is required." },
        { status: 400 }
      );
    }

    // 3. Security: Verify business ownership
    const bizRef = doc(db, "businesses", businessId);
    const bizSnap = await getDoc(bizRef);

    if (bizSnap.exists()) {
      const bizData = bizSnap.data();
      if (bizData.ownerId && bizData.ownerId !== verifiedUser.uid) {
        return NextResponse.json(
          { error: "Forbidden: You are not authorized to delete media for this venue." },
          { status: 403 }
        );
      }
    }

    // 4. Delete file from ImageKit via Server SDK
    const imagekit = getServerImageKitInstance();
    await imagekit.deleteFile(fileId);

    return NextResponse.json({
      success: true,
      message: "Image successfully deleted from ImageKit.",
    });
  } catch (err: unknown) {
    console.error("ImageKit delete error:", err);
    const errorMsg =
      err instanceof Error ? err.message : "Failed to delete image from ImageKit.";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
