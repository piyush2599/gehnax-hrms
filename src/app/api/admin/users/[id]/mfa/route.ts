import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

type Ctx = { params: { id: string } };

// GET — return current MFA status of a user
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }

  await connectDB();
  const user = await User.findById(params.id).select(
    "name email mfaEnabled mfaSkipCount mfaDisabledUntil mfaForceSetup"
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    mfaEnabled:       user.mfaEnabled,
    mfaSkipCount:     user.mfaSkipCount,
    mfaDisabledUntil: user.mfaDisabledUntil ?? null,
    mfaForceSetup:    user.mfaForceSetup ?? false,
  });
}

// PATCH — admin actions: disable | disable_temp | force_reregister | remove_override
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }

  const { action, disableHours, password } = await req.json();
  if (!password) return NextResponse.json({ error: "Password confirmation required" }, { status: 400 });

  await connectDB();

  // Verify super admin password
  const admin = await User.findById((session.user as any).id).select("+password");
  if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });

  const target = await User.findById(params.id).select(
    "+mfaSecret mfaEnabled mfaSkipCount mfaDisabledUntil mfaForceSetup"
  );
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  switch (action) {
    case "disable":
      // Permanently remove MFA — user will be prompted to set up again (with skips)
      target.mfaEnabled      = false;
      target.mfaSecret       = undefined;
      target.mfaSkipCount    = 0;
      target.mfaForceSetup   = false;
      target.mfaDisabledUntil = undefined;
      break;

    case "disable_temp": {
      const hours = Number(disableHours);
      if (!hours || hours <= 0 || hours > 24 * 30) {
        return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
      }
      const until = new Date(Date.now() + hours * 60 * 60 * 1000);
      target.mfaDisabledUntil = until;
      break;
    }

    case "force_reregister":
      // Wipe MFA secret, force fresh setup — no skips allowed
      target.mfaEnabled      = false;
      target.mfaSecret       = undefined;
      target.mfaSkipCount    = 0;
      target.mfaForceSetup   = true;
      target.mfaDisabledUntil = undefined;
      break;

    case "remove_override":
      // Clear temporary disable or force-setup flag, leaving existing MFA intact
      target.mfaDisabledUntil = undefined;
      target.mfaForceSetup    = false;
      break;

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await target.save();

  return NextResponse.json({
    success: true,
    mfaEnabled:       target.mfaEnabled,
    mfaDisabledUntil: target.mfaDisabledUntil ?? null,
    mfaForceSetup:    target.mfaForceSetup,
  });
}
