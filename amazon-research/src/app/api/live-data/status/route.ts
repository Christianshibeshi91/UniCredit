import { NextResponse } from "next/server";
import { getLiveDataStatus } from "@/lib/spapi/dataBridge";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = getLiveDataStatus();
  return NextResponse.json(status);
}
