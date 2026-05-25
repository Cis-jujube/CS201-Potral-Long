import { NextResponse, type NextRequest } from "next/server";

import { getAdminSessionFromRequest } from "@/lib/auth/admin";
import { deleteClassNote, parseClassNotePatch, updateClassNote } from "@/lib/class-notes/store";

export const dynamic = "force-dynamic";

interface ClassNoteRouteProps {
  params: Promise<{ id: string }>;
}

const forbidden = () => NextResponse.json({ ok: false, error: "Admin access required." }, { status: 403 });

export async function PATCH(request: NextRequest, { params }: ClassNoteRouteProps) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return forbidden();
  }

  try {
    const { id } = await params;
    const note = await updateClassNote(id, parseClassNotePatch(await request.json()), session.username);
    return NextResponse.json({ ok: true, note });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Class note update failed." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: ClassNoteRouteProps) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return forbidden();
  }

  try {
    const { id } = await params;
    const note = await deleteClassNote(id);
    return NextResponse.json({ ok: true, note });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Class note delete failed." },
      { status: 400 },
    );
  }
}
