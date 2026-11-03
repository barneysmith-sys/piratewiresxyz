import { NextResponse } from "next/server";

export type PaginationMeta = {
  limit: number;
  nextCursor: string | null;
};

export type ApiSuccess<T> = {
  data: T;
  meta?: PaginationMeta;
};

export type ApiFailure = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function apiSuccess<T>(data: T, status = 200, meta?: PaginationMeta) {
  const body: ApiSuccess<T> = meta ? { data, meta } : { data };
  return NextResponse.json(body, { status });
}

export function apiError(status: number, code: string, message: string, details?: unknown) {
  const body: ApiFailure = {
    error: details === undefined ? { code, message } : { code, message, details },
  };
  return NextResponse.json(body, { status });
}
