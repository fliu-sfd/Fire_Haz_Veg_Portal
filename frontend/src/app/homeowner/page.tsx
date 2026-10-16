import type { Metadata } from "next";
import { HomeownerAccount } from "@/features/auth/components/homeowner-account";

export const metadata: Metadata = {
  title: "Homeowner portal",
  description: "Access and manage your property vegetation assessment.",
};

export default function HomeownerPage() {
  return <HomeownerAccount />;
}
