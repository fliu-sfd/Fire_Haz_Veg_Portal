"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getHealth } from "@/features/system/api";

type State = { kind: "idle" | "loading" } | { kind: "success"; status: string } | { kind: "error" };

export function BackendStatus() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  async function checkConnection() {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setState({ kind: "loading" });
    try {
      const data = await getHealth(AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]));
      if (!controller.signal.aborted) setState({ kind: "success", status: data.status });
    } catch {
      if (!controller.signal.aborted) setState({ kind: "error" });
    }
  }

  return (
    <Card title="Backend connection example">
      <p className="mb-4 text-sm text-slate-600">Use this example to verify the frontend can reach FastAPI.</p>
      <Button onClick={checkConnection} disabled={state.kind === "loading"}>
        {state.kind === "loading" ? "Checking…" : "Check connection"}
      </Button>
      <div aria-live="polite" role="status" className="mt-3 text-sm">
        {state.kind === "success" && <p className="text-green-800">Backend responded: {state.status}</p>}
        {state.kind === "error" && <p className="text-red-800">Couldn’t reach the health endpoint. Check that FastAPI is running, the API URL is correct, and CORS allows this frontend.</p>}
      </div>
    </Card>
  );
}
