import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-access";
import { readInquiriesFromDb } from "@/lib/db/inquiries";
import {
  deleteRegisteredUserFromDb,
  readRegisteredUsersFromDb,
} from "@/lib/db/registered-users";

export async function GET() {
  const forbiddenResponse = await requireAdminApiAccess();
  if (forbiddenResponse) return forbiddenResponse;

  const users = await readRegisteredUsersFromDb();
  return NextResponse.json({ users });
}

export async function DELETE(request: Request) {
  try {
    const forbiddenResponse = await requireAdminApiAccess();
    if (forbiddenResponse) return forbiddenResponse;

    const payload = (await request.json()) as {
      id?: string;
    };

    if (!payload.id) {
      return NextResponse.json({ error: "Need user id." }, { status: 400 });
    }

    await deleteRegisteredUserFromDb(payload.id);

    const [users, inquiries] = await Promise.all([
      readRegisteredUsersFromDb(),
      readInquiriesFromDb(),
    ]);

    return NextResponse.json({ users, inquiries });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "CANNOT_DELETE_ADMIN") {
      return NextResponse.json(
        { error: "Admin user cannot be deleted." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Could not delete user." },
      { status: 500 }
    );
  }
}
