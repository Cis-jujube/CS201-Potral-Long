import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";

import { GET as ADMIN_GET } from "@/app/api/admin/class-notes/route";
import { DELETE, PATCH } from "@/app/api/admin/class-notes/[id]/route";
import { POST as UPLOAD } from "@/app/api/admin/class-notes/upload/route";
import { GET as WEEK_GET } from "@/app/api/class-notes/week/[week]/route";
import { createSessionToken, PORTAL_SESSION_COOKIE } from "@/lib/auth/session";
import { readClassNotes } from "@/lib/class-notes/store";

const makeJsonRequest = async (url: string, username: string, method: string, body?: unknown) =>
  new NextRequest(url, {
    method,
    headers: {
      cookie: `${PORTAL_SESSION_COOKIE}=${await createSessionToken(username)}`,
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const makeUploadRequest = async (username: string, form: FormData) =>
  new NextRequest("http://localhost/api/admin/class-notes/upload", {
    method: "POST",
    headers: {
      cookie: `${PORTAL_SESSION_COOKIE}=${await createSessionToken(username)}`,
    },
    body: form,
  });

const makeUploadForm = (file: File) => {
  const form = new FormData();
  form.set("week", "2");
  form.set("title", "Week 2 board notes");
  form.set("originalFileName", file.name);
  form.set("file", file, file.name);
  return form;
};

describe("class notes APIs", () => {
  const originalEnv = process.env;
  let tempDir = "";
  let metadataPath = "";
  let publicDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "cs201-class-notes-"));
    metadataPath = path.join(tempDir, "class-notes.json");
    publicDir = path.join(tempDir, "public");
    process.env = {
      ...originalEnv,
      CS201_PORTAL_USERS: "teacher:secret,student:secret",
      CS201_PORTAL_SESSION_SECRET: "class-notes-test-secret",
      CS201_ADMIN_USERS: "teacher",
      CS201_CLASS_NOTES_PATH: metadataPath,
      CS201_CLASS_NOTES_PUBLIC_DIR: publicDir,
    };
  });

  afterEach(async () => {
    process.env = originalEnv;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("rejects non-admin upload attempts", async () => {
    const denied = await UPLOAD(
      await makeUploadRequest(
        "student",
        makeUploadForm(new File(["%PDF-1.4"], "notes.pdf", { type: "application/pdf" })),
      ),
    );

    expect(denied.status).toBe(403);
  });

  it("rejects unsupported file types", async () => {
    const response = await UPLOAD(
      await makeUploadRequest("teacher", makeUploadForm(new File(["bad"], "notes.txt", { type: "text/plain" }))),
    );
    const payload = (await response.json()) as { ok: boolean; error: string };

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error).toMatch(/Only PDF/);
  });

  it("rejects files whose MIME type does not match the extension", async () => {
    const response = await UPLOAD(
      await makeUploadRequest("teacher", makeUploadForm(new File(["bad"], "notes.pdf", { type: "text/plain" }))),
    );
    const payload = (await response.json()) as { ok: boolean; error: string };

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error).toMatch(/does not match/);
  });

  it("accepts every allowed class note file type without descriptions", async () => {
    const allowedFiles = [
      new File(["%PDF-1.4"], "notes.pdf", { type: "application/pdf" }),
      new File(["png"], "notes.png", { type: "image/png" }),
      new File(["jpg"], "notes.jpg", { type: "image/jpeg" }),
      new File(["jpeg"], "notes.jpeg", { type: "image/jpeg" }),
      new File(["webp"], "notes.webp", { type: "image/webp" }),
    ];

    for (const file of allowedFiles) {
      const response = await UPLOAD(await makeUploadRequest("teacher", makeUploadForm(file)));
      expect(response.status).toBe(201);
    }

    const notes = await readClassNotes();
    expect(notes).toHaveLength(allowedFiles.length);
    expect(notes.every((note) => note.description === undefined)).toBe(true);
  });

  it("uploads, lists, hides, and deletes class notes", async () => {
    const upload = await UPLOAD(
      await makeUploadRequest(
        "teacher",
        makeUploadForm(new File(["%PDF-1.4 class note"], "notes.pdf", { type: "application/pdf" })),
      ),
    );
    const uploadPayload = (await upload.json()) as { ok: boolean; note: { id: string; storedFileName: string } };

    expect(upload.status).toBe(201);
    expect(uploadPayload.ok).toBe(true);
    expect((await readFile(path.join(publicDir, uploadPayload.note.storedFileName))).byteLength).toBeGreaterThan(0);
    expect((await readClassNotes()).map((note) => note.title)).toEqual(["Week 2 board notes"]);
    expect((await readClassNotes())[0].description).toBeUndefined();

    const adminList = await ADMIN_GET(await makeJsonRequest("http://localhost/api/admin/class-notes", "teacher", "GET"));
    expect(adminList.status).toBe(200);

    const weekList = await WEEK_GET(
      new NextRequest("http://localhost/api/class-notes/week/2"),
      { params: Promise.resolve({ week: "2" }) },
    );
    const weekPayload = (await weekList.json()) as { ok: boolean; notes: Array<{ title: string }> };
    expect(weekPayload.notes.map((note) => note.title)).toEqual(["Week 2 board notes"]);

    const hidden = await PATCH(
      await makeJsonRequest(`http://localhost/api/admin/class-notes/${uploadPayload.note.id}`, "teacher", "PATCH", {
        title: "Hidden board notes",
        week: 2,
        description: "Ignored admin description",
        hidden: true,
      }),
      { params: Promise.resolve({ id: uploadPayload.note.id }) },
    );
    expect(hidden.status).toBe(200);
    expect((await readClassNotes())[0].description).toBeUndefined();

    const hiddenWeekList = await WEEK_GET(
      new NextRequest("http://localhost/api/class-notes/week/2"),
      { params: Promise.resolve({ week: "2" }) },
    );
    const hiddenWeekPayload = (await hiddenWeekList.json()) as { ok: boolean; notes: unknown[] };
    expect(hiddenWeekPayload.notes).toEqual([]);

    const deleted = await DELETE(
      await makeJsonRequest(`http://localhost/api/admin/class-notes/${uploadPayload.note.id}`, "teacher", "DELETE"),
      { params: Promise.resolve({ id: uploadPayload.note.id }) },
    );
    expect(deleted.status).toBe(200);
    expect(await readClassNotes()).toEqual([]);
  });
});
