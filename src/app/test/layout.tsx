import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat Widget Test - iKunnect",
  description: "Test page for GoHighLevel chat widget integration with iKunnect Agent Chat Desk",
};

export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="test-page">
      {children}
    </div>
  );
}

