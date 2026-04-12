import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Sidebar } from '../../components/delivery/Sidebar';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Delivery Partner Portal',
  description: 'Logix Flow Delivery Dashboard',
};

export default function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`min-h-screen bg-neutral-50 ${inter.variable} font-sans flex flex-col md:flex-row`}>
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full h-full p-4 md:p-8">
            {children}
        </div>
      </main>
    </div>
  );
}
