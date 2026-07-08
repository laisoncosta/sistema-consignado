import { NextResponse } from "next/server";

import { clearSessionFromResponse } from "@/lib/session";

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  return clearSessionFromResponse(response, request);
}
