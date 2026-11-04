import type { Metadata } from "next";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = {
  title: "Settings",
  description: "Edit the wording of messages the portal shows to people.",
};

export default function SettingsPage() {
  return <SettingsView />;
}
