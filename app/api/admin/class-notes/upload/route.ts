import { NextResponse, type NextRequest } from "next/server";

import { getAdminSessionFromRequest } from "@/lib/auth/admin";
import { createClassNote, parseClassNoteWeek } from "@/lib/class-notes/store";

export const dynamic = "force-dynamic";

const forbidden = () => NextResponse.json({ ok: false, error: "Admin access required." }, { status: 403 });

const isUploadedFile = (value: FormDataEntryValue | null): value is File =>
  typeof value === "object" &&
  value !== null &&
  "name" in value &&
  "size" in value &&
  "arrayBuffer" in value &&
  typeof value.arrayBuffer === "function";

export async function POST(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return forbidden();
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!isUploadedFile(file)) {
      throw new Error("File is required.");
    }

    const note = await createClassNote({
      week: parseClassNoteWeek(form.get("week")),
      title: String(form.get("title") ?? ""),
      file,
      originalFileName: String(form.get("originalFileName") ?? ""),
      createdBy: session.username,
    });

    return NextResponse.json({ ok: true, note }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Class note upload failed." },
      { status: 400 },
    );
  }
}
