// app/api/health/route.ts
import { NextResponse } from "next/server";
import { addCorsHeaders, handleOptionsRequest } from "@/lib/utils/cors";

export async function OPTIONS() {
  return handleOptionsRequest();
}

export async function GET() {
  const response = NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
  return addCorsHeaders(response);
}
