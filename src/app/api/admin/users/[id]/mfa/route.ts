import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

type Action = "disable" | "disable_temp" | "force_reregister" | "remove_override";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionRoles: string[] = (session.user as any).roles || [];
  if (!sessionRoles.includes("super_admin")) {
    return NextResponse.json(
      { error: "Only Super Admin can manage MFA" },
      { status: 403 }
    );
  }

  const { action, disableHours, password } = (await req.json()) as {
    action: Action;
    disableHours?: number;
    password?: string;
  };

  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Admin password is required" }, { status: 400 });
  }

  await connectDB();

  // Verify the super admin's own password
  const admin = await User.findById((session.user as any).id).select("+password");
  if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 });

  const passwordMatch = await bcrypt.compare(password, admin.password);
  if (!passwordMatch) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const target = await User.findById(params.id);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Build a mongoose update. `$unset` clears the stored secret / bypass window
  // so the login flow (see src/lib/auth.ts) re-evaluates cleanly.
  const set: Record<string, any> = {};
  const unset: Record<string, any> = {};

  switch (action) {
    // Removes MFA entirely. On next login mfaSetupRequired=true (not mandatory) —
    // the user may set it up again or skip.
    case "disable":
      set.mfaEnabled = false;
      set.mfaForceSetup = false;
      set.mfaSkipCount = 0;
      unset.mfaSecret = "";
      unset.mfaDisabledUntil = "";
      unset.mfaVerifiedAt = "";
      unset.mfaSkippedAt = "";
      break;

    // Keeps MFA enabled but bypasses the TOTP prompt until a future time.
    // Ideal when the device is only temporarily unavailable.
    case "disable_temp": {
      const hours = Number(disableHours);
      if (!hours || hours <= 0) {
        return NextResponse.json({ error: "Invalid bypass duration" }, { status: 400 });
      }
      set.mfaDisabledUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
      break;
    }

    // Wipes the current secret and forces a fresh setup that cannot be skipped.
    // This is the correct action for a lost/replaced device.
    case "force_reregister":
      set.mfaEnabled = false;
      set.mfaForceSetup = true;
      set.mfaSkipCount = 0;
      unset.mfaSecret = "";
      unset.mfaDisabledUntil = "";
      unset.mfaVerifiedAt = "";
      unset.mfaSkippedAt = "";
      break;

    // Cancels either a temporary bypass or a forced re-register, leaving the
    // user's underlying MFA state untouched.
    case "remove_override":
      set.mfaForceSetup = false;
      unset.mfaDisabledUntil = "";
      break;

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const update: Record<string, any> = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;

  await User.findByIdAndUpdate(params.id, update);

  return NextResponse.json({ message: "MFA settings updated", action });
}
