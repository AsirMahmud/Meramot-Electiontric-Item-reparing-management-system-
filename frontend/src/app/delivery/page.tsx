"use client";

import { motion } from 'framer-motion';
import { ShieldCheck, Package, TrendingUp, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function DeliveryDashboard() {
  return (
    <div className="flex flex-col h-full">
      {/* Header Profile Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-neutral-100"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-orange-50 p-[2px]">
            <div className="w-full h-full rounded-full bg-neutral-200">
               <img src="https://i.pravatar.cc/150?img=11" alt="Profile" className="w-full h-full object-cover rounded-full" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 leading-tight">Welcome back, Jonathan</h1>
            <p className="text-sm text-neutral-500 font-medium flex items-center gap-2 mt-1">
               <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
               Online and ready for requests
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-neutral-900 text-white px-5 py-3 rounded-xl font-semibold hover:bg-neutral-800 transition-colors">
            Go Offline
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
              <div className="flex justify-between items-end">
                <h3 className="text-2xl font-bold text-neutral-900">Active Requests</h3>
                <Link href="/delivery/map" className="text-orange-600 font-bold flex items-center gap-1 hover:text-orange-700 transition-colors">
                   View Live Map <ChevronRight size={18} />
                </Link>
              </div>

              {/* Assignment Queue Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/delivery/order/1">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-[2rem] p-6 shadow-sm border border-neutral-100 h-full flex flex-col cursor-pointer transition-all"
                  >
                    <div className="flex justify-between mb-6">
                       <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider">High Priority</span>
                       <span className="text-xl text-neutral-900 font-extrabold">$18.50</span>
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-6 relative pl-8 pb-6">
                       <div className="absolute left-[3px] top-2 bottom-4 w-0.5 bg-neutral-100 z-0"></div>
                       <div className="relative z-10 flex flex-col gap-1">
                          <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center border border-white">
                              <div className="w-1.5 h-1.5 rounded-full bg-orange-600"></div>
                          </div>
                          <h4 className="text-sm font-bold text-neutral-900">123 Market St, Apt 4B</h4>
                          <p className="text-xs text-neutral-500">Customer Pickup</p>
                       </div>
                       <div className="relative z-10 flex flex-col gap-1">
                          <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-sm bg-neutral-900 flex items-center justify-center border border-white">
                              <div className="w-1 h-1 bg-white"></div>
                          </div>
                          <h4 className="text-sm font-bold text-neutral-900">North Hub Repair Center</h4>
                          <p className="text-xs text-neutral-500">Repair Center Dropoff</p>
                       </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-neutral-100 mt-auto">
                       <div className="flex items-center gap-2 text-sm font-semibold text-neutral-600">
                          <Package size={16} /> Samsung S23 Ultra
                       </div>
                       <div className="text-xs font-bold text-neutral-500 bg-neutral-50 px-3 py-1.5 rounded-lg">
                          4.2 mi • 22 min
                       </div>
                    </div>
                  </motion.div>
                </Link>

                <Link href="/delivery/order/2">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-[2rem] p-6 shadow-sm border border-neutral-100 h-full flex flex-col cursor-pointer transition-all opacity-80 hover:opacity-100"
                  >
                    <div className="flex justify-between mb-6">
                       <span className="bg-neutral-100 text-neutral-600 text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider">Standard Return</span>
                       <span className="text-xl text-neutral-900 font-extrabold">$9.00</span>
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-6 relative pl-8 pb-6">
                       <div className="absolute left-[3px] top-2 bottom-4 w-0.5 bg-neutral-100 z-0"></div>
                       <div className="relative z-10 flex flex-col gap-1">
                          <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-full bg-neutral-200 flex items-center justify-center border border-white">
                              <div className="w-1.5 h-1.5 rounded-full bg-neutral-600"></div>
                          </div>
                          <h4 className="text-sm font-bold text-neutral-900">Service Center C</h4>
                          <p className="text-xs text-neutral-500">Pickup Repaired Device</p>
                       </div>
                       <div className="relative z-10 flex flex-col gap-1">
                          <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-sm bg-neutral-900 flex items-center justify-center border border-white">
                              <div className="w-1 h-1 bg-white"></div>
                          </div>
                          <h4 className="text-sm font-bold text-neutral-900">445 Riverside Dr</h4>
                          <p className="text-xs text-neutral-500">Customer Dropoff</p>
                       </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-neutral-100 mt-auto">
                       <div className="flex items-center gap-2 text-sm font-semibold text-neutral-600">
                          <Package size={16} /> MacBook Pro M2
                       </div>
                       <div className="text-xs font-bold text-neutral-500 bg-neutral-50 px-3 py-1.5 rounded-lg">
                          2.1 mi • 12 min
                       </div>
                    </div>
                  </motion.div>
                </Link>
              </div>
          </div>

          {/* Sidebar Area Column */}
          <div className="lg:col-span-1 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-[2rem] p-8 shadow-xl relative overflow-hidden text-white"
              >
                <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
                
                <h3 className="text-neutral-400 font-medium mb-1 inline-flex items-center gap-2">Earnings Overview <ShieldCheck size={16} className="text-green-400" /></h3>
                <h2 className="text-5xl font-extrabold tracking-tight mb-8">$142.50</h2>
                
                <div className="flex items-center justify-between mb-4">
                   <div className="flex gap-2">
                       <TrendingUp className="text-orange-400" />
                       <span className="font-semibold text-neutral-200">Daily Goal</span>
                   </div>
                   <span className="text-orange-400 font-bold">84%</span>
                </div>

                <div className="w-full h-2.5 bg-neutral-700/50 rounded-full overflow-hidden mb-8 backdrop-blur-sm">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "84%" }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-600"
                  ></motion.div>
                </div>

                <button className="w-full py-4 text-sm font-bold bg-white text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors">
                    View Full Earnings
                </button>
              </motion.div>

              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-neutral-100">
                  <div className="flex justify-between items-center mb-6">
                      <h4 className="font-bold text-neutral-900">Recent Activity</h4>
                  </div>
                  <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                          <div key={i} className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                                     <ShieldCheck size={18} className="text-green-600" />
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold text-neutral-900">Delivery Completed</p>
                                     <p className="text-xs text-neutral-500">Today, {11 + i}:30 AM</p>
                                  </div>
                              </div>
                              <span className="text-sm font-bold text-green-600">+$12</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}
