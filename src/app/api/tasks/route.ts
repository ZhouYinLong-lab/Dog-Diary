import { NextRequest, NextResponse } from "next/server";
import {
  carryOverTasks,
  createTask,
  deleteTask,
  getTasks,
  updateTaskStatus,
} from "@/lib/diary-db";
import { todayIsoDate } from "@/lib/date-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") || todayIsoDate();
  const carry = request.nextUrl.searchParams.get("carry") === "true";

  const tasks = await getTasks(date);

  if (carry) {
    const carried = await carryOverTasks(date);
    if (carried.length > 0) {
      return NextResponse.json({ tasks: [...tasks, ...carried], carried: carried.length });
    }
  }

  return NextResponse.json({ tasks, carried: 0 });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    date: string;
    title: string;
    source?: "manual" | "yesterday" | "review";
  };
  if (!body.date || !body.title) {
    return NextResponse.json({ error: "date and title required" }, { status: 400 });
  }
  const task = await createTask(body);
  return NextResponse.json({ task });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as {
    id: string;
    status: "planned" | "done" | "skipped";
  };
  if (!body.id || !body.status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }
  await updateTaskStatus(body.id, body.status);
  return NextResponse.json({ updated: true });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await deleteTask(id);
  return NextResponse.json({ deleted: true });
}
