"use client";

import { motion } from 'framer-motion';
import { MapPin, Navigation2 } from 'lucide-react';

export default function MapPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-neutral-900 relative rounded-3xl overflow-hidden m-2 border-2 border-neutral-800 shadow-xl">
      <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=37.77,-122.42&zoom=11&size=1000x800&maptype=roadmap&style=element:geometry%7Ccolor:0x212121&style=element:labels.icon%7Cvisibility:off&style=element:labels.text.fill%7Ccolor:0x757575&style=element:labels.text.stroke%7Ccolor:0x212121&style=feature:administrative%7Celement:geometry%7Ccolor:0x757575&style=feature:administrative.country%7Celement:labels.text.fill%7Ccolor:0x9e9e9e&style=feature:administrative.land_parcel%7Cvisibility:off&style=feature:administrative.locality%7Celement:labels.text.fill%7Ccolor:0xbdbdbd&style=feature:poi%7Celement:labels.text.fill%7Ccolor:0x757575&style=feature:poi.park%7Celement:geometry%7Ccolor:0x181818&style=feature:poi.park%7Celement:labels.text.fill%7Ccolor:0x616161&style=feature:poi.park%7Celement:labels.text.stroke%7Ccolor:0x1b1b1b&style=feature:road%7Celement:geometry.fill%7Ccolor:0x2c2c2c&style=feature:road%7Celement:labels.text.fill%7Ccolor:0x8a8a8a&style=feature:road.arterial%7Celement:geometry%7Ccolor:0x373737&style=feature:road.highway%7Celement:geometry%7Ccolor:0x3c3c3c&style=feature:road.highway.controlled_access%7Celement:geometry%7Ccolor:0x4e4e4e&style=feature:road.local%7Celement:labels.text.fill%7Ccolor:0x616161&style=feature:transit%7Celement:labels.text.fill%7Ccolor:0x757575&style=feature:water%7Celement:geometry%7Ccolor:0x000000&style=feature:water%7Celement:labels.text.fill%7Ccolor:0x3d3d3d')] bg-cover bg-center mix-blend-screen opacity-50"></div>
      
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-neutral-900/80 backdrop-blur border border-white/10 px-4 py-2 rounded-full text-white text-xs font-bold flex items-center gap-2">
         <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Looking for nearby requests...
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
         <div className="w-16 h-16 bg-orange-500/20 rounded-full animate-ping absolute"></div>
         <div className="w-10 h-10 bg-orange-500 rounded-full border-4 border-neutral-900 flex items-center justify-center relative z-10 shadow-[0_0_20px_rgba(249,115,22,0.5)]">
            <Navigation2 className="text-white fill-white translate-x-[1px] -translate-y-[1px]" size={16} />
         </div>
      </div>
    </div>
  );
}
