"use client";

import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Trophy, ArrowUpRight, History, Calendar, Star } from 'lucide-react';

export default function EarningsPage() {
  const transactions = [
    { id: 1, type: "Delivery (Fragile Bonus)", amount: 18.50, date: "Today, 2:40 PM", status: "Completed" },
    { id: 2, type: "Return Dispatch", amount: 9.00, date: "Today, 11:15 AM", status: "Completed" },
    { id: 3, type: "Urgency Multiplier", amount: 4.50, date: "Yesterday", status: "Processing" },
    { id: 4, type: "Delivery Base Fare", amount: 12.00, date: "Yesterday", status: "Completed" },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-neutral-50 px-5 pt-8 max-w-4xl max-w-5xl mx-auto w-full">
      <h1 className="text-2xl font-extrabold text-neutral-900 mb-6">Earnings & Stats</h1>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-neutral-900 text-white rounded-[1.5rem] p-6 shadow-xl mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-3xl rounded-full"></div>
        <p className="text-neutral-400 text-sm font-medium mb-2">Available Balance</p>
        <h2 className="text-5xl font-extrabold mb-6 tracking-tight">$1,248<span className="text-neutral-400 text-3xl">.50</span></h2>
        
        <button className="w-full bg-white hover:bg-neutral-100 text-neutral-900 font-bold py-3.5 rounded-xl transition-colors text-sm shadow-sm flex justify-center items-center gap-2">
            Instant Payout <ArrowUpRight size={18} />
        </button>
      </motion.div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-[1.25rem] border border-neutral-100 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mb-3">
               <Trophy size={16} />
            </div>
            <p className="text-xs text-neutral-500 font-medium">Partner Tier</p>
            <h3 className="text-lg font-bold text-neutral-900">Platinum</h3>
        </div>
        <div className="bg-white p-4 rounded-[1.25rem] border border-neutral-100 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 mb-3">
               <Star size={16} />
            </div>
            <p className="text-xs text-neutral-500 font-medium">Overall Rating</p>
            <h3 className="text-lg font-bold text-neutral-900">4.9 / 5.0</h3>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
         <h3 className="text-lg font-bold text-neutral-900">Recent Transactions</h3>
         <button className="text-orange-600 text-xs font-bold bg-orange-50 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-colors">
            Download CSV
         </button>
      </div>

      <div className="space-y-3 pb-8">
        {transactions.map((tx, i) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            key={tx.id} 
            className="bg-white p-4 rounded-xl border border-neutral-100 flex justify-between items-center"
          >
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-600 border border-neutral-200">
                  <DollarSign size={18} />
               </div>
               <div>
                  <h4 className="text-sm font-bold text-neutral-900">{tx.type}</h4>
                  <p className="text-xs text-neutral-500">{tx.date}</p>
               </div>
            </div>
            <div className="text-right">
               <p className="text-sm font-bold text-green-600">+${tx.amount.toFixed(2)}</p>
               <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  tx.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
               }`}>
                  {tx.status}
               </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
