import type { Metadata } from "next";
import ProfileClient from "@/components/ProfileClient";

export const metadata: Metadata = { title: "My Profile" };

export default function ProfilePage() {
  return <ProfileClient />;
}
