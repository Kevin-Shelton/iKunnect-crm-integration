import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "iKunnect - Customer Experience Platform",
  description: "Connect with our expert agents through intelligent conversations, powered by AI and delivered by professional support team.",
};

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="customer-page">
      {children}
    </div>
  );
}

