import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "Dashboard Banjir Semarang",
  description: "Monitoring & Prediksi 1 Jam",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="text-slate-900">{children}</body>
    </html>
  );
}
