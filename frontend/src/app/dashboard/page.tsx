import type { Metadata } from "next";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Staff dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="border-l-4 border-denim pl-4 text-4xl font-light text-charcoal">Staff dashboard</h1>
      <Card title="Staff workflow starter">
        <p className="text-city-dark">Build assessment lists, required inspection photos, homeowner submission reviews, and property history here.</p>
        <p className="mt-3 text-sm text-city-dark">This starter page is public. Staff authentication and backend authorization must be implemented before adding real records.</p>
      </Card>
    </div>
  );
}
