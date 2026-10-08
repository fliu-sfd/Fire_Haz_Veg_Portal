import type { Metadata } from "next";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Homeowner" };

export default function HomeownerPage() {
  return (
    <div className="space-y-6">
      <h1 className="border-l-4 border-denim pl-4 text-4xl font-light text-charcoal">Homeowner portal</h1>
      <Card title="Homeowner flow starter">
        <p className="text-city-dark">This page is ready for your team to add hazard details, cleanup instructions, and corrective photo uploads.</p>
        <p className="mt-3 text-sm text-city-dark">The QR access flow and assessment API contract still need to be agreed with the backend team.</p>
      </Card>
    </div>
  );
}
