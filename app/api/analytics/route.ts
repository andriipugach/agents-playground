import { NextResponse } from "next/server";
import { AnalyticsValidationError } from "@/lib/analytics-service";
import { analyticsService } from "@/lib/analytics-repository";

export const POST = async (request: Request) => {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON request body" }, { status: 400 });
  }

  try {
    const result = await analyticsService.getMetric(payload);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AnalyticsValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Unable to load analytics" }, { status: 500 });
  }
};
