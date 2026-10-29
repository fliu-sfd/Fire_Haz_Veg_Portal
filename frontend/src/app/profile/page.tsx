import type { Metadata } from "next";
import { ProfileView } from "./profile-view";

export const metadata: Metadata = {
  title: "Profile",
  description: "View your account, update your name and phone, and change your password.",
};

export default function ProfilePage() {
  return <ProfileView />;
}
