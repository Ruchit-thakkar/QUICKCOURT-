import { NextRequest, NextResponse } from "next/server";
import { verifyAuthHeader } from "@/lib/ai/authHelper";
import { validateImageFile } from "@/lib/imageValidation";
import {
  getServerImageKitInstance,
  getImageKitFolderPath,
  generateImageFilename,
} from "@/lib/imagekit";
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

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const businessId = (formData.get("businessId") as string)?.trim();
    const photoType = ((formData.get("photoType") as string) || "gallery").toLowerCase() as
      | "logo"
      | "cover"
      | "gallery";

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided." },
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
          { error: "Forbidden: You are not authorized to upload media for this venue." },
          { status: 403 }
        );
      }
    }
    // If setup mode (business doc not yet created in Firestore), verifiedUser is the creator.

    // 4. Validate file format and size
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid image file." },
        { status: 400 }
      );
    }

    // 5. Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. Generate collision-safe filename & folder path
    const fileName = generateImageFilename(businessId, photoType, file.name);
    const folder = getImageKitFolderPath(businessId, photoType);

    // 7. Upload to ImageKit via Server SDK
    const imagekit = getServerImageKitInstance();
    const uploadRes = await imagekit.upload({
      file: buffer,
      fileName,
      folder,
      useUniqueFileName: false, // We already guarantee unique collision-safe naming
      tags: [businessId, photoType, "quickcourt"],
    });

    return NextResponse.json({
      success: true,
      data: {
        fileId: uploadRes.fileId,
        name: uploadRes.name,
        url: uploadRes.url,
        thumbnailUrl: uploadRes.thumbnailUrl || uploadRes.url,
        height: uploadRes.height,
        width: uploadRes.width,
        size: uploadRes.size,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    console.error("ImageKit upload error:", err);
    const errorMsg =
      err instanceof Error ? err.message : "Failed to upload image to ImageKit.";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
