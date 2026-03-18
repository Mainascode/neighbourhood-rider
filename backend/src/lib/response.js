import { NextResponse } from "next/server";

export function ok(data = {}, init = {}) {
  return NextResponse.json(data, init);
}

export function fail(message, status = 400, extras = {}) {
  return NextResponse.json({ message, ...extras }, { status });
}
