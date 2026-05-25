import { cookies } from "next/headers";

import { PageIntro } from "@/components/layout/PageIntro";
import { AdminBoard } from "@/components/pages/AdminBoard";
import { StatePanel } from "@/components/ui/StatePanel";
import { isAdminUsername } from "@/lib/auth/admin";
import { getSessionPayload, PORTAL_SESSION_COOKIE } from "@/lib/auth/session";
import { PAGE_TONE_MAP, getModuleToneClass } from "@/lib/config/moduleTones";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = await getSessionPayload(cookieStore.get(PORTAL_SESSION_COOKIE)?.value);

  if (!session || !isAdminUsername(session.username)) {
    return (
      <StatePanel
        type="error"
        title="Admin access required"
        message="This page is limited to portal users listed in CS201_ADMIN_USERS."
      />
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <PageIntro
        className={cn(
          "surface-card module-tone-context module-tone-border p-5",
          getModuleToneClass(PAGE_TONE_MAP.faq.intro),
        )}
        title="Admin"
        description="Edit local CS201 portal content without writing to teacher-site reflection or voting systems."
      />
      <AdminBoard />
    </div>
  );
}
