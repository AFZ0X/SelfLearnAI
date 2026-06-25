import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <Link href="/" className="text-xl font-bold">
          SelfLearn AI
        </Link>
      </header>
      {children}
    </div>
  );
}
