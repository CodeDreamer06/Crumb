import "@fontsource/inter/index.css";
import "./globals.css";

export const metadata = {
  title: "Crumb",
  description: "AI-powered cooking assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-[#FFFFF8] text-foreground">
        {children}
      </body>
    </html>
  );
}
