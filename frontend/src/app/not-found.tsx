import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-light text-charcoal">Page not found</h1>
      <Link href="/" className="font-semibold text-denim underline-offset-4 hover:underline">Back to overview</Link>
    </div>
  );
}
