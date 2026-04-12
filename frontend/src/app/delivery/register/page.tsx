"use client";

import { motion } from 'framer-motion';
import { Camera, ShieldCheck, ChevronRight, UploadCloud, User, MapPin, Calendar, CreditCard, Truck, FileText } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef } from 'react';

export default function DeliveryRegistration() {
  const frontIdRef = useRef<HTMLInputElement>(null);
  const backIdRef = useRef<HTMLInputElement>(null);
  const licenseRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLInputElement>(null);

  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    if (e.target.files && e.target.files[0]) {
      setter(URL.createObjectURL(e.target.files[0]));
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-white relative pb-32 rounded-3xl shadow-sm border border-neutral-100 max-w-4xl mx-auto w-full overflow-hidden">
      {/* Header */}
      <div className="px-5 md:px-8 pt-8 pb-6 border-b border-neutral-100">
        <h1 className="text-3xl font-extrabold text-neutral-900 leading-tight mb-2">Partner Onboarding</h1>
        <p className="text-base text-neutral-500 font-medium">Complete your profile to start earning with Logix Flow.</p>
      </div>

      <div className="flex-1 px-5 md:px-8 mt-6 pb-12 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-8"
        >
          {/* Step 1: Personal Details */}
          <section className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <span className="text-orange-600 font-bold">1</span>
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 text-lg">Personal Information</h3>
                <p className="text-sm text-neutral-500">Provide your basic details.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                  <User size={16} className="text-neutral-400" /> Full Legal Name
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all placeholder:text-neutral-400 text-neutral-900"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                  <Calendar size={16} className="text-neutral-400" /> Date of Birth
                </label>
                <input 
                  type="date" 
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all text-neutral-900"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                  <MapPin size={16} className="text-neutral-400" /> Full Address
                </label>
                <textarea 
                  placeholder="Street address, City, ZIP code"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all placeholder:text-neutral-400 text-neutral-900 resize-none"
                />
              </div>
            </div>
          </section>

          {/* Step 2: Identification Upload */}
          <section className="bg-orange-50/30 rounded-2xl border-2 border-orange-500 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                <span className="text-white font-bold">2</span>
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 text-lg">Identity Verification</h3>
                <p className="text-sm text-neutral-700">Required by law to process your payouts.</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
               <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                  <CreditCard size={16} className="text-neutral-400" /> National ID Number
               </label>
               <input 
                  type="text" 
                  placeholder="Enter 10 or 13 digit NID number"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all placeholder:text-neutral-400 text-neutral-900 bg-white"
               />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  onClick={() => frontIdRef.current?.click()}
                  className="border-2 border-dashed border-orange-300 bg-white rounded-xl h-36 flex flex-col items-center justify-center text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer relative overflow-hidden group"
                >
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={frontIdRef}
                      onChange={(e) => handleImageUpload(e, setFrontImage)}
                    />
                    {frontImage ? (
                      <img src={frontImage} className="w-full h-full object-cover" alt="Front NID" />
                    ) : (
                      <>
                        <Camera size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-bold uppercase tracking-wider">Upload Front NID</span>
                      </>
                    )}
                </div>

                <div 
                  onClick={() => backIdRef.current?.click()}
                  className="border-2 border-dashed border-orange-300 bg-white rounded-xl h-36 flex flex-col items-center justify-center text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer relative overflow-hidden group"
                >
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={backIdRef}
                      onChange={(e) => handleImageUpload(e, setBackImage)}
                    />
                    {backImage ? (
                      <img src={backImage} className="w-full h-full object-cover" alt="Back NID" />
                    ) : (
                      <>
                        <Camera size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-bold uppercase tracking-wider">Upload Back NID</span>
                      </>
                    )}
                </div>
            </div>
          </section>

          {/* Step 3: Vehicle & Background */}
          <section className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 text-lg">Vehicle & Documents</h3>
                <p className="text-sm text-neutral-500">Provide details about your vehicle and qualifications.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                  <Truck size={16} className="text-neutral-400" /> Vehicle Type
                </label>
                <select className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-neutral-900 appearance-none bg-white">
                  <option value="">Select a vehicle</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="car">Car / Sedan</option>
                  <option value="van">Delivery Van</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                  <CreditCard size={16} className="text-neutral-400" /> License Plate Number
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. ABC-1234"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all placeholder:text-neutral-400 text-neutral-900"
                />
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                <CreditCard size={16} className="text-neutral-400" /> Driving License Number
              </label>
              <input 
                type="text" 
                placeholder="Enter license number"
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all placeholder:text-neutral-400 text-neutral-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                onClick={() => licenseRef.current?.click()}
                className="border border-neutral-300 bg-neutral-50 rounded-xl py-4 px-4 flex items-center justify-between hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                  <input type="file" className="hidden" ref={licenseRef} />
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-blue-500" />
                    <div>
                      <p className="font-semibold text-sm text-neutral-800">Driving License</p>
                      <p className="text-xs text-neutral-500">Scan or image</p>
                    </div>
                  </div>
                  <UploadCloud size={20} className="text-neutral-400" />
              </div>

              <div 
                onClick={() => transcriptRef.current?.click()}
                className="border border-neutral-300 bg-neutral-50 rounded-xl py-4 px-4 flex items-center justify-between hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                  <input type="file" className="hidden" ref={transcriptRef} />
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-blue-500" />
                    <div>
                      <p className="font-semibold text-sm text-neutral-800">Education Transcript</p>
                      <p className="text-xs text-neutral-500">Highest degree obtained</p>
                    </div>
                  </div>
                  <UploadCloud size={20} className="text-neutral-400" />
              </div>
            </div>
          </section>
          
          <div className="bg-neutral-50 rounded-xl p-5 flex items-start gap-4 border border-neutral-100">
              <ShieldCheck size={28} className="text-green-500 shrink-0" />
              <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                  Your data is protected and securely encrypted. By proceeding, you agree to our <Link href="#" className="text-orange-600 underline underline-offset-2">Terms of Service</Link> and <Link href="#" className="text-orange-600 underline underline-offset-2">Privacy Policy</Link>.
              </p>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 w-full p-5 lg:px-8 bg-white border-t border-neutral-100 pb-8 flex flex-col sm:flex-row gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <button className="flex-1 bg-white border-2 border-neutral-200 text-neutral-700 font-bold py-3.5 rounded-2xl hover:bg-neutral-50 transition-colors text-sm active:scale-[0.98]">
              Save Draft
          </button>
          <button className="flex-[2] bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3.5 rounded-2xl transition-transform active:scale-[0.98] shadow-lg shadow-orange-500/30 text-base flex justify-center items-center gap-2">
              Submit Application <ChevronRight size={20} />
          </button>
      </div>
    </div>
  );
}
