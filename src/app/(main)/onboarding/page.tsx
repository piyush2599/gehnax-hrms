import type { Metadata } from "next";
import OnboardingClient from "@/components/onboarding/OnboardingClient";

export const metadata: Metadata = { title: "Onboarding" };

export default function OnboardingPage() {
  return <OnboardingClient />;
}
