import { NextRequest } from "next/server";

import { getDashboard } from "@/lib/deskwise-store";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? undefined;
  const data = getDashboard(date ?? "");

  return Response.json({ ok: true, data });
}
