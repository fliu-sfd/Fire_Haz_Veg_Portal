import type { Metadata } from "next";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Staff dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Staff dashboard</h1>
      <Card title="Staff workflow starter">
        <p className="text-slate-600">Build assessment lists, required inspection photos, homeowner submission reviews, and property history here.</p>
        <p className="mt-3 text-sm text-slate-500">This starter page is public. Staff authentication and backend authorization must be implemented before adding real records.</p>
      </Card>
    </div>
  );
}
