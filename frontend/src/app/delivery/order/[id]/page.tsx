"use client";

import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Package, AlertTriangle, ShieldAlert, CheckCircle2, Navigation2, DollarSign, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function OrderRequestDetails({ params }: { params: { id: string } }) {
  const router = useRouter();

  return (
    <div className="flex flex-col bg-white rounded-3xl overflow-hidden shadow-sm border border-neutral-100 relative pb-28">
      {/* Top Header & Map Placeholder */}
      <div className="relative h-64 bg-neutral-200">
        <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=37.7749,-122.4194&zoom=13&size=600x300&maptype=roadmap&style=element:geometry%7Ccolor:0x242f3e&style=element:labels.text.stroke%7Ccolor:0x242f3e&style=element:labels.text.fill%7Ccolor:0x746855&style=feature:administrative.locality%7Celement:labels.text.fill%7Ccolor:0xd59563&style=feature:poi%7Celement:labels.text.fill%7Ccolor:0xd59563&style=feature:poi.park%7Celement:geometry%7Ccolor:0x263c3f&style=feature:poi.park%7Celement:labels.text.fill%7Ccolor:0x6b9a76&style=feature:road%7Celement:geometry%7Ccolor:0x38414e&style=feature:road%7Celement:geometry.stroke%7Ccolor:0x212a37&style=feature:road%7Celement:labels.text.fill%7Ccolor:0x9ca5b3&style=feature:road.highway%7Celement:geometry%7Ccolor:0x746855&style=feature:road.highway%7Celement:geometry.stroke%7Ccolor:0x1f2835&style=feature:road.highway%7Celement:labels.text.fill%7Ccolor:0xf3d19c&style=feature:transit%7Celement:geometry%7Ccolor:0x2f3948&style=feature:transit.station%7Celement:labels.text.fill%7Ccolor:0xd59563&style=feature:water%7Celement:geometry%7Ccolor:0x17263c&style=feature:water%7Celement:labels.text.fill%7Ccolor:0x515c6d&style=feature:water%7Celement:labels.text.stroke%7Ccolor:0x17263c')] bg-cover bg-center mix-blend-luminosity opacity-40"></div>
        
        {/* Safe Area Header */}
        <div className="absolute top-0 w-full p-6 flex justify-between items-center z-10">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-neutral-900 border border-neutral-100"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="bg-neutral-900 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
             Request #{params.id}
          </div>
        </div>

        {/* Floating Route info */}
        <div className="absolute bottom-4 left-4 right-4 flex gap-2">
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl text-neutral-900 font-bold text-sm shadow-lg flex items-center gap-2 border border-white/50">
                <Clock size={16} className="text-orange-500" /> 22 mins
            </div>
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl text-neutral-900 font-bold text-sm shadow-lg flex items-center gap-2 border border-white/50">
                <Navigation2 size={16} className="text-orange-500" /> 4.2 mi
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-5 -mt-6 relative z-20"
      >
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-neutral-100">
            {/* Header / Payout */}
            <div className="flex justify-between items-start mb-6">
                <div>
                   <h2 className="text-2xl font-extrabold text-neutral-900 mb-1">Pickup Request</h2>
                   <p className="text-sm text-neutral-500 font-medium">Customer to Service Center</p>
                </div>
                <div className="text-right">
                   <h3 className="text-2xl font-extrabold text-green-600">$18.50</h3>
                   <span className="text-[10px] uppercase font-bold tracking-wider text-green-700 bg-green-100 px-2 py-0.5 rounded">Guaranteed</span>
                </div>
            </div>

            {/* Device Info & Warnings */}
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-2 text-red-700 text-sm font-bold mb-2">
                    <ShieldAlert size={18} /> DEVICE SPECIFICATIONS
                </div>
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                        <Package size={24} className="text-red-500" />
                    </div>
                    <div>
                        <h4 className="font-bold text-neutral-900">Samsung S23 Ultra</h4>
                        <p className="text-xs text-red-600 font-medium mt-1 uppercase tracking-wide">⚠️ BROKEN SCREEN - HANDLE WITH CARE</p>
                        <p className="text-xs text-neutral-500 mt-2 line-clamp-2">Ensure the device is placed in the shock-proof padded sleeve before transit. Serial verification required upon pickup.</p>
                    </div>
                </div>
            </div>

            {/* Routing Details */}
            <div className="relative">
                <div className="absolute top-4 left-3 w-0.5 h-[4.5rem] bg-neutral-200"></div>
                
                {/* Pickup node */}
                <div className="flex gap-4 mb-6 relative">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 z-10 border border-white">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-600"></div>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Pickup Location</p>
                        <h4 className="text-sm font-bold text-neutral-900">123 Market St, Apt 4B</h4>
                        <p className="text-xs text-neutral-500">Meet customer in lobby</p>
                    </div>
                </div>

                {/* Dropoff node */}
                <div className="flex gap-4 relative">
                    <div className="w-6 h-6 rounded-sm bg-neutral-900 flex items-center justify-center flex-shrink-0 z-10 border border-white relative">
                        <div className="w-1.5 h-1.5 bg-white"></div>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Dropoff Location</p>
                        <h4 className="text-sm font-bold text-neutral-900">North Hub Repair Center</h4>
                        <p className="text-xs text-neutral-500">Technician Bay 3</p>
                    </div>
                </div>
            </div>

        </div>
      </motion.div>

      {/* Floating Action Button Floor */}
      <div className="absolute bottom-0 left-0 w-full p-5 bg-gradient-to-t from-white via-white to-transparent z-40 pb-6">
         <div className="flex gap-4 max-w-xl mx-auto">
             <button className="flex-[1] bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-4 px-6 rounded-[1rem] transition-colors shadow-sm border border-neutral-200 active:scale-95 text-lg">
                 Decline
             </button>
             <button className="flex-[2] bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-[1rem] transition-transform active:scale-95 shadow-lg shadow-orange-500/30 flex items-center justify-center gap-3 text-lg">
                 Accept Request <ArrowRight size={22} />
             </button>
         </div>
      </div>
    </div>
  );
}

function ArrowRight(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/>
      <path d="m12 5 7 7-7 7"/>
    </svg>
  );
}
