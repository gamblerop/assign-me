import { useState, useEffect } from 'react';
import { createOrder } from '../services/dbService';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, MapPin, Search, User, Clipboard, Sliders, Calendar, CheckCircle } from 'lucide-react';

interface OrderWizardProps {
  userProfile: any;
  onOrderSuccess: () => void;
}

export default function OrderWizard({ userProfile, onOrderSuccess }: OrderWizardProps) {
  const [step, setStep] = useState(1);
  
  // Selections
  const [userType, setUserType] = useState<'Hosteller' | 'Day Scholar'>('Hosteller');
  const [hostel, setHostel] = useState('');
  const [deliveryPoint, setDeliveryPoint] = useState('');
  const [hostelSearch, setHostelSearch] = useState('');
  const [hostelList, setHostelList] = useState<string[]>([]);
  
  // Step 3
  const [userName, setUserName] = useState('');
  const [handwriting, setHandwriting] = useState<'Printed' | 'Cursive'>('Printed');
  
  // Step 4 & 5
  const [service, setService] = useState('A4 Assignment');
  const [servicePrice, setServicePrice] = useState(10);
  const [manualType, setManualType] = useState('');
  const [manualUnit, setManualUnit] = useState(''); // 'experiment' | 'exercise'
  const [manualPerPrice, setManualPerPrice] = useState(0);
  const [manualFullPrice, setManualFullPrice] = useState(0);
  const [fullManual, setFullManual] = useState(false);
  const [qty, setQty] = useState(10);
  const [content, setContent] = useState<'Upload' | 'AI Content'>('Upload');

  // Step 6
  const [deliveryDate, setDeliveryDate] = useState('');
  const [isTomorrow, setIsTomorrow] = useState(false);
  const [quickDates, setQuickDates] = useState<{ label: string; dateStr: string; dateObj: Date }[]>([]);

  // Price calculations
  const [basePrice, setBasePrice] = useState(0);
  const [urgentFee, setUrgentFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const deliveryPoints = [
    'Arch Gate', 'UB Building', 'Gate 51 — Gents Hostel', 'Bell Block',
    'Clock Tower', 'Vendhere Square', 'Tech Park 2', 'Global Hospital',
    'Aishwarya Flats', 'Estancia Flats', 'Aboard Valley'
  ];

  const manualOptions = [
    { name: 'Chemistry Manual', emoji: '⚗️', perPrice: 50, fullPrice: 550, unit: 'experiment' },
    { name: 'Semiconductor Manual', emoji: '🔬', perPrice: 50, fullPrice: 550, unit: 'experiment' },
    { name: 'EGD Manual', emoji: '📐', perPrice: 40, fullPrice: 430, unit: 'exercise' },
    { name: 'Mechanical Manual', emoji: '⚙️', perPrice: 60, fullPrice: 670, unit: 'exercise' }
  ];

  // Fetch Hostels on mount
  useEffect(() => {
    const fetchHostels = async () => {
      try {
        const snap = await getDocs(collection(db, 'hostels'));
        if (!snap.empty) {
          const names = snap.docs.map(doc => doc.data().name);
          setHostelList(names);
        } else {
          // Fallback static list
          setHostelList([
            'Kalpana Chawla', 'Meenakshi', 'Kaparadeivi', 'ESQ A', 'ESQ B',
            'Sannasi A', 'Sannasi C', 'Began', 'Paari (G Block)', 'Kaari (H Block)',
            'Oori (I Block)', 'Adhiyaman (J Block)', 'Nelson Mandela Hostel (NRI)',
            'Agasthiyar (Dormitory)', 'Melligai', 'Senbagam', 'N Block', 'Mullai',
            'Kopperundevi', 'Manorinjitam'
          ]);
        }
      } catch (err) {
        console.error('Error fetching hostels:', err);
      }
    };

    fetchHostels();
    prefillQuickDates();
  }, []);

  // Sync profile name on login
  useEffect(() => {
    if (userProfile?.name) {
      setUserName(userProfile.name);
    }
  }, [userProfile]);

  // Generate quick delivery dates
  const prefillQuickDates = () => {
    const today = new Date();
    const dates = [];
    const labels = ['Tomorrow', 'In 2 days', 'In 3 days', 'In 5 days', 'In 7 days'];
    const offsets = [1, 2, 3, 5, 7];

    for (let i = 0; i < offsets.length; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + offsets[i]);
      const formatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      dates.push({
        label: labels[i],
        dateStr: formatted,
        dateObj: d
      });
    }
    setQuickDates(dates);
  };

  // Recalculate Prices
  useEffect(() => {
    // 1. Base Price
    let base = 0;
    if (service === 'Manuals') {
      base = fullManual ? manualFullPrice : (manualPerPrice * qty);
    } else {
      base = servicePrice * qty;
    }
    setBasePrice(base);

    // 2. Urgent Surcharge (+₹20 per page/unit if Tomorrow is selected)
    let urgent = 0;
    if (isTomorrow) {
      urgent = fullManual ? 100 : (20 * qty); // Flat urgent fee for full manual
    }
    setUrgentFee(urgent);

    // 3. Loyalty discount (10 points = ₹1, up to 50% of base price)
    let appliedDiscount = 0;
    if (userProfile?.points) {
      const userPts = userProfile.points;
      const pointDiscountValue = Math.floor(userPts / 10);
      const maxDiscountValue = Math.floor(base * 0.5); // cap at 50%
      appliedDiscount = Math.min(pointDiscountValue, maxDiscountValue);
    }
    setDiscount(appliedDiscount);

    // 4. Grand Total
    setTotal(base + urgent - appliedDiscount);

  }, [service, servicePrice, manualType, fullManual, manualFullPrice, manualPerPrice, qty, isTomorrow, userProfile]);

  const handleDateSelect = (dObj: Date, dStr: string) => {
    setDeliveryDate(dStr);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const selectTomorrow = dObj.toDateString() === tomorrow.toDateString();
    setIsTomorrow(selectTomorrow);
  };

  const handleCustomDateChange = (val: string) => {
    if (!val) return;
    const d = new Date(val + 'T00:00:00');
    const formatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    handleDateSelect(d, formatted);
  };

  const nextStep = () => {
    if (step === 2) {
      if (userType === 'Hosteller' && !hostel) {
        alert('Please select a hostel location.');
        return;
      }
      if (userType === 'Day Scholar' && !deliveryPoint) {
        alert('Please select a delivery point.');
        return;
      }
    }
    if (step === 3) {
      if (!userName.trim()) {
        alert('Please enter your name.');
        return;
      }
    }
    if (step === 5) {
      if (service === 'Manuals' && !manualType) {
        alert('Please select a manual type.');
        return;
      }
    }
    if (step === 6) {
      if (!deliveryDate) {
        alert('Please choose a delivery date.');
        return;
      }
    }
    setStep(s => Math.min(s + 1, 7));
  };

  const prevStep = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const selectManualTypeOption = (opt: typeof manualOptions[0]) => {
    setManualType(opt.name);
    setManualUnit(opt.unit);
    setManualPerPrice(opt.perPrice);
    setManualFullPrice(opt.fullPrice);
    setFullManual(false); // Default to per-experiment
    setQty(1); // Reset to 1
  };

  const submitOrderAction = async () => {
    setLoading(true);
    try {
      const orderLabelQty = fullManual ? 'Full Manual' :
                           manualUnit === 'exercise' ? `${qty} Exercises` :
                           manualUnit === 'experiment' ? `${qty} Experiments` :
                           service === 'A3 Sheets' ? `${qty} Sheets` : `${qty} Pages`;

      const orderData = {
        userId: userProfile?.id || '',
        name: userName,
        email: userProfile?.email || '',
        userType,
        hostel: userType === 'Hosteller' ? hostel : '',
        pickup: userType === 'Day Scholar' ? 'Gate 51 — Gents Hostel' : '',
        delivery: userType === 'Day Scholar' ? deliveryPoint : '',
        service: service === 'Manuals' ? manualType : service,
        manualType: service === 'Manuals' ? manualType : '',
        handwriting,
        qty: orderLabelQty,
        qtyValue: qty,
        content,
        deliveryDate,
        urgent: isTomorrow,
        basePrice,
        urgentFee,
        discount,
        total
      };

      await createOrder(orderData);

      // Open WhatsApp pre-filled text
      const orderSummaryText = `Hi Assign Me! I just placed an assignment order.
      
Name: ${userName}
Type: ${userType}
Location: ${userType === 'Hosteller' ? hostel : deliveryPoint}
Handwriting: ${handwriting}
Service: ${service === 'Manuals' ? manualType : service} (${orderLabelQty})
Source: ${content === 'Upload' ? 'My Photos' : 'AI Content'}
Date: ${deliveryDate}
Total Price: ₹${total} (Base: ₹${basePrice}, Surcharge: ₹${urgentFee}, applied discount: ₹${discount})`;

      const msg = encodeURIComponent(orderSummaryText);
      window.open(`https://wa.me/916374030823?text=${msg}`, '_blank');

      onOrderSuccess();
      setStep(1); // Reset step
      // Reset variables
      setHostel('');
      setDeliveryPoint('');
      setService('A4 Assignment');
      setServicePrice(10);
      setManualType('');
      setFullManual(false);
      setQty(10);
      setDeliveryDate('');
      setIsTomorrow(false);
    } catch (err) {
      console.error(err);
      alert('Order submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter hostels
  const filteredHostels = hostelList.filter(name =>
    name.toLowerCase().includes(hostelSearch.toLowerCase())
  );

  return (
    <section id="order" className="py-20 bg-[#040f1e] border-t border-[#0d2d50]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-syne text-3xl md:text-4xl font-extrabold text-white mb-4">
            Start Your Order
          </h2>
          <p className="text-[#7da3cc] text-sm md:text-base max-w-[550px] mx-auto">
            Our structured order form maps your specifications in under 2 minutes.
          </p>
        </div>

        <div className="max-w-3xl mx-auto bg-[#071628] border border-[#0d2d50] rounded-2xl overflow-hidden shadow-2xl">
          {/* Progress Header */}
          <div className="flex bg-[#040e1c] border-b border-[#0d2d50] overflow-x-auto whitespace-nowrap">
            {[
              { num: 1, label: 'Type' },
              { num: 2, label: 'Location' },
              { num: 3, label: 'Writing' },
              { num: 4, label: 'Service' },
              { num: 5, label: 'Options' },
              { num: 6, label: 'Date' },
              { num: 7, label: 'Summary' }
            ].map((s) => (
              <button
                key={s.num}
                onClick={() => { if (s.num < step) setStep(s.num); }}
                className={`flex-1 min-w-[70px] text-center py-4 flex flex-col items-center gap-1.5 border-r border-[#0d2d50]/60 last:border-0 cursor-pointer ${
                  step === s.num
                    ? 'text-white font-semibold'
                    : s.num < step
                    ? 'text-emerald-400'
                    : 'text-[#7da3cc]/40'
                }`}
              >
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold transition-all ${
                  step === s.num
                    ? 'bg-[#1a6fff] border-[#1a6fff] text-white'
                    : s.num < step
                    ? 'bg-[#00e87a]/10 border-[#00e87a] text-emerald-400'
                    : 'bg-[#020b18] border-[#0d2d50] text-[#7da3cc]/40'
                }`}>
                  {s.num < step ? '✓' : s.num}
                </div>
                <span className="text-[10px] uppercase tracking-wider">{s.label}</span>
              </button>
            ))}
          </div>

          {/* Form Pages */}
          <div className="p-6 md:p-8 min-h-[340px]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  key="step1"
                  className="space-y-6"
                >
                  <div>
                    <h3 className="font-syne text-xl font-bold text-white mb-2">1. Select Your User Type</h3>
                    <p className="text-[#7da3cc] text-xs md:text-sm">Are you staying in a university hostel or traveling as a day scholar?</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => setUserType('Hosteller')}
                      className={`p-6 bg-[#0a1f38] border-2 rounded-xl text-center cursor-pointer hover:border-[#1a6fff] group transition-all duration-200 ${
                        userType === 'Hosteller' ? 'border-[#1a6fff] bg-[#1a6fff]/5' : 'border-[#0d2d50]'
                      }`}
                    >
                      <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">🏠</span>
                      <h4 className="font-syne text-base font-bold text-white">Hosteller</h4>
                      <p className="text-[#7da3cc] text-xs mt-1.5 leading-relaxed">Delivered directly to your specified hostel block & room</p>
                    </button>
                    
                    <button
                      onClick={() => setUserType('Day Scholar')}
                      className={`p-6 bg-[#0a1f38] border-2 rounded-xl text-center cursor-pointer hover:border-[#1a6fff] group transition-all duration-200 ${
                        userType === 'Day Scholar' ? 'border-[#1a6fff] bg-[#1a6fff]/5' : 'border-[#0d2d50]'
                      }`}
                    >
                      <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">🎒</span>
                      <h4 className="font-syne text-base font-bold text-white">Day Scholar</h4>
                      <p className="text-[#7da3cc] text-xs mt-1.5 leading-relaxed">Delivered directly at fixed campus gate pickup locations</p>
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  key="step2"
                  className="space-y-6"
                >
                  {userType === 'Hosteller' ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-syne text-xl font-bold text-white mb-1">2. Select Your Hostel</h3>
                        <p className="text-[#7da3cc] text-xs">Delivered directly to your designated block.</p>
                      </div>

                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#7da3cc]" />
                        <input
                          type="text"
                          value={hostelSearch}
                          onChange={(e) => setHostelSearch(e.target.value)}
                          placeholder="Search hostel names..."
                          className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 pl-11 pr-4 text-[#e8f0fe] text-sm focus:outline-none focus:border-[#1a6fff]"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto p-1 border border-[#0d2d50]/50 rounded-xl bg-[#040f1e]">
                        {filteredHostels.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setHostel(name)}
                            className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                              hostel === name
                                ? 'bg-[#1a6fff] text-white'
                                : 'bg-[#0a1f38] border border-[#0d2d50] text-[#7da3cc] hover:border-[#1a6fff]/50'
                            }`}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div>
                        <h3 className="font-syne text-xl font-bold text-white mb-1">2. Day Scholar Pickup &amp; Delivery</h3>
                        <p className="text-[#7da3cc] text-xs">Standard pick-up is Gate 51. Select your target delivery point.</p>
                      </div>

                      <div className="p-4 bg-[#0a1f38] border border-[#0d2d50] rounded-xl flex items-center gap-3">
                        <MapPin className="text-sky-400 w-5 h-5 flex-shrink-0" />
                        <div>
                          <div className="text-white text-xs font-semibold">Fixed Pickup Point: Gate 51 — Gents Hostel</div>
                          <div className="text-[#7da3cc] text-[10px] mt-0.5">Bring your assignments / sheets to Gate 51 for hand-in</div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#7da3cc] mb-2 uppercase tracking-wider">
                          Select Delivery Point <span className="text-red-500">*</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {deliveryPoints.map((point) => (
                            <button
                              key={point}
                              type="button"
                              onClick={() => setDeliveryPoint(point)}
                              className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                deliveryPoint === point
                                  ? 'bg-[#1a6fff] text-white'
                                  : 'bg-[#0a1f38] border border-[#0d2d50] text-[#7da3cc] hover:border-[#1a6fff]/50'
                              }`}
                            >
                              {point}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  key="step3"
                  className="space-y-6"
                >
                  <div>
                    <h3 className="font-syne text-xl font-bold text-white mb-1">3. Handwriting Specifications</h3>
                    <p className="text-[#7da3cc] text-xs">Enter your details to coordinate order papers correctly.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#7da3cc] mb-1.5 uppercase tracking-wider">
                      Student Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#7da3cc]" />
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Enter student name to write on covers"
                        required
                        className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 pl-11 pr-4 text-[#e8f0fe] text-sm focus:outline-none focus:border-[#1a6fff]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#7da3cc] mb-2 uppercase tracking-wider">
                      Choose Handwriting Style
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setHandwriting('Printed')}
                        className={`p-5 bg-[#0a1f38] border-2 rounded-xl text-center cursor-pointer transition-all ${
                          handwriting === 'Printed' ? 'border-[#1a6fff] bg-[#1a6fff]/5' : 'border-[#0d2d50]'
                        }`}
                      >
                        <div className="text-3xl font-bold font-sans text-white mb-2">Aa</div>
                        <h4 className="font-syne text-sm font-bold text-white">Printed</h4>
                        <p className="text-[#7da3cc] text-[10px] mt-1">Clean, standard block print letters</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHandwriting('Cursive')}
                        className={`p-5 bg-[#0a1f38] border-2 rounded-xl text-center cursor-pointer transition-all ${
                          handwriting === 'Cursive' ? 'border-[#1a6fff] bg-[#1a6fff]/5' : 'border-[#0d2d50]'
                        }`}
                      >
                        <div className="text-3xl font-bold font-dancing text-[#00cfff] mb-2">Aa</div>
                        <h4 className="font-syne text-sm font-bold text-white">Cursive</h4>
                        <p className="text-[#7da3cc] text-[10px] mt-1">Smooth, flowing joined characters</p>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  key="step4"
                  className="space-y-6"
                >
                  <div>
                    <h3 className="font-syne text-xl font-bold text-white mb-1">4. Select Assignment Category</h3>
                    <p className="text-[#7da3cc] text-xs">Choose the correct page-size base layout.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { name: 'A4 Assignment', emoji: '📄', desc: 'Standard lined A4 assignments', price: 10 },
                      { name: 'A3 Sheets', emoji: '📊', desc: 'Large laboratory sheet charts', price: 30 },
                      { name: 'Manuals', emoji: '📗', desc: 'Specialized pre-made booklets', price: 40 }
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.name}
                        onClick={() => {
                          setService(item.name);
                          setServicePrice(item.price);
                          if (item.name !== 'Manuals') {
                            setManualType('');
                          }
                        }}
                        className={`p-5 bg-[#0a1f38] border-2 rounded-xl text-center cursor-pointer transition-all hover:border-[#1a6fff] ${
                          service === item.name ? 'border-[#1a6fff] bg-[#1a6fff]/5' : 'border-[#0d2d50]'
                        }`}
                      >
                        <div className="text-3xl mb-2">{item.emoji}</div>
                        <h4 className="font-syne text-sm font-bold text-white">{item.name}</h4>
                        <p className="text-[#7da3cc] text-[10px] mt-1.5 leading-relaxed">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  key="step5"
                  className="space-y-5"
                >
                  <div>
                    <h3 className="font-syne text-xl font-bold text-white mb-1">5. Configure Order Details</h3>
                    <p className="text-[#7da3cc] text-xs">Adjust your sheet specifications and quantity numbers.</p>
                  </div>

                  {service === 'Manuals' && (
                    <div className="space-y-3.5">
                      <label className="block text-xs font-semibold text-[#7da3cc] uppercase tracking-wider">
                        Select Manual Type <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {manualOptions.map((opt) => (
                          <button
                            type="button"
                            key={opt.name}
                            onClick={() => selectManualTypeOption(opt)}
                            className={`p-3.5 bg-[#0a1f38] border-2 rounded-xl text-left flex items-center justify-between cursor-pointer transition-all ${
                              manualType === opt.name ? 'border-[#1a6fff] bg-[#1a6fff]/5' : 'border-[#0d2d50]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">{opt.emoji}</span>
                              <div>
                                <div className="text-white text-xs font-bold font-syne">{opt.name}</div>
                                <div className="text-[10px] text-[#7da3cc] mt-0.5">
                                  ₹{opt.perPrice}/{opt.unit} · Full: ₹{opt.fullPrice}
                                </div>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              manualType === opt.name ? 'border-[#1a6fff] bg-[#1a6fff]' : 'border-[#0d2d50]'
                            }`}>
                              {manualType === opt.name && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </button>
                        ))}
                      </div>

                      {manualType && (
                        <div className="pt-2 animate-fadeIn">
                          <label className="block text-xs font-semibold text-[#7da3cc] mb-2 uppercase tracking-wider">
                            Order Mode
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => { setFullManual(false); setServicePrice(manualPerPrice); setQty(1); }}
                              className={`p-3 bg-[#0a1f38] border rounded-xl text-center cursor-pointer ${
                                !fullManual ? 'border-[#1a6fff] bg-[#1a6fff]/5 text-white' : 'border-[#0d2d50] text-[#7da3cc]'
                              }`}
                            >
                              <div className="text-xs font-bold font-syne">Per Experiment</div>
                              <div className="text-[10px] mt-0.5">₹{manualPerPrice} each</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setFullManual(true); setServicePrice(manualFullPrice); setQty(1); }}
                              className={`p-3 bg-[#0a1f38] border rounded-xl text-center cursor-pointer ${
                                fullManual ? 'border-[#1a6fff] bg-[#1a6fff]/5 text-white' : 'border-[#0d2d50] text-[#7da3cc]'
                              }`}
                            >
                              <div className="text-xs font-bold font-syne">Full Manual</div>
                              <div className="text-[10px] mt-0.5">₹{manualFullPrice} fixed</div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!fullManual && (
                    <div className="flex justify-between items-center bg-[#0a1f38] border border-[#0d2d50] rounded-xl p-4">
                      <div>
                        <div className="text-white text-xs font-bold font-syne">
                          {service === 'Manuals'
                            ? `Number of ${manualUnit === 'exercise' ? 'Exercises' : 'Experiments'}`
                            : service === 'A3 Sheets'
                            ? 'Number of Sheets'
                            : 'Number of Pages'}
                        </div>
                        <div className="text-[#7da3cc] text-[10px] mt-0.5">Select a quantity count</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQty(q => Math.max(1, q - 1))}
                          className="w-8 h-8 rounded-lg bg-[#071628] border border-[#0d2d50] text-white flex items-center justify-center font-bold hover:border-[#1a6fff] cursor-pointer"
                        >
                          −
                        </button>
                        <span className="font-syne text-base font-bold text-white w-6 text-center">{qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(q => q + 1)}
                          className="w-8 h-8 rounded-lg bg-[#071628] border border-[#0d2d50] text-white flex items-center justify-center font-bold hover:border-[#1a6fff] cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-[#7da3cc] mb-2 uppercase tracking-wider">
                      Content Source
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setContent('Upload')}
                        className={`p-3.5 bg-[#0a1f38] border rounded-xl text-center cursor-pointer transition-all ${
                          content === 'Upload' ? 'border-[#1a6fff] bg-[#1a6fff]/5 text-white' : 'border-[#0d2d50] text-[#7da3cc]'
                        }`}
                      >
                        Upload Reference Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setContent('AI Content')}
                        className={`p-3.5 bg-[#0a1f38] border rounded-xl text-center cursor-pointer transition-all ${
                          content === 'AI Content' ? 'border-[#1a6fff] bg-[#1a6fff]/5 text-white' : 'border-[#0d2d50] text-[#7da3cc]'
                        }`}
                      >
                        Let AI Generate Content
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 6 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  key="step6"
                  className="space-y-6"
                >
                  <div>
                    <h3 className="font-syne text-xl font-bold text-white mb-1">6. Select Delivery Date</h3>
                    <p className="text-[#7da3cc] text-xs font-sans">Choose when you want the written sheets delivered.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#7da3cc] mb-1.5 uppercase tracking-wider">
                      Select Specific Date
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => handleCustomDateChange(e.target.value)}
                      className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-3 px-4 text-white font-medium focus:outline-none focus:border-[#1a6fff] cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#7da3cc] mb-2 uppercase tracking-wider">
                      Quick Priority Options
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {quickDates.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => handleDateSelect(item.dateObj, item.dateStr)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                            deliveryDate === item.dateStr
                              ? 'bg-[#1a6fff] text-white ring-2 ring-[#1a6fff]/40'
                              : 'bg-[#0a1f38] border border-[#0d2d50] text-[#7da3cc] hover:border-[#1a6fff]/40'
                          }`}
                        >
                          {item.label} · {item.dateStr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {deliveryDate && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl border flex items-center gap-3.5 transition-all ${
                        isTomorrow
                          ? 'border-[#ffc940] bg-[#ffc940]/5 text-[#ffc940]'
                          : 'border-[#1a6fff] bg-[#1a6fff]/5 text-white'
                      }`}
                    >
                      <Calendar className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold font-syne">
                          Delivery Date Chosen: {deliveryDate}
                        </div>
                        <div className="text-[10px] mt-0.5 leading-relaxed opacity-85">
                          {isTomorrow
                            ? '⚡ URGENT DELIVERY — An express fee of ₹20 per page / unit will be applied to this order.'
                            : 'Standard processing — Your sheets will arrive pristine on this date.'}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {step === 7 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  key="step7"
                  className="space-y-6"
                >
                  <div>
                    <h3 className="font-syne text-xl font-bold text-white mb-1">7. Review Order Summary</h3>
                    <p className="text-[#7da3cc] text-xs">Verify all transcription criteria before submitting.</p>
                  </div>

                  <div className="bg-[#0a1f38] border border-[#0d2d50] rounded-xl p-4.5 space-y-2.5 text-xs">
                    <div className="flex justify-between pb-2 border-b border-[#0d2d50]/70 font-syne font-semibold text-white">
                      <span>Parameter</span>
                      <span>Your Config</span>
                    </div>
                    <div className="flex justify-between text-[#7da3cc]">
                      <span>Student Name</span>
                      <span className="text-white font-medium">{userName}</span>
                    </div>
                    <div className="flex justify-between text-[#7da3cc]">
                      <span>User Type</span>
                      <span className="text-white font-medium">{userType}</span>
                    </div>
                    {userType === 'Hosteller' ? (
                      <div className="flex justify-between text-[#7da3cc]">
                        <span>Hostel</span>
                        <span className="text-white font-medium">{hostel}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-[#7da3cc]">
                        <span>Delivery Point</span>
                        <span className="text-white font-medium">{deliveryPoint}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#7da3cc]">
                      <span>Handwriting Style</span>
                      <span className="text-white font-medium">{handwriting}</span>
                    </div>
                    <div className="flex justify-between text-[#7da3cc]">
                      <span>Service</span>
                      <span className="text-white font-medium">
                        {service === 'Manuals' ? manualType : service}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#7da3cc]">
                      <span>Quantity</span>
                      <span className="text-white font-medium">
                        {fullManual ? 'Full Manual' : `${qty} sheets / pages`}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#7da3cc]">
                      <span>Content Source</span>
                      <span className="text-white font-medium">{content === 'Upload' ? 'My Photos' : 'AI Content'}</span>
                    </div>
                    <div className="flex justify-between text-[#7da3cc]">
                      <span>Delivery Target Date</span>
                      <span className="text-white font-medium">{deliveryDate}</span>
                    </div>
                  </div>

                  {/* Calculations breakdown */}
                  <div className="bg-[#0a1f38] border border-[#0d2d50] rounded-xl p-4.5 space-y-2.5 text-xs">
                    <div className="flex justify-between text-[#7da3cc]">
                      <span>Base Pricing Code</span>
                      <span className="text-white">₹{basePrice}</span>
                    </div>
                    <div className="flex justify-between text-[#ffc940]">
                      <span>Urgent Priority Surcharge</span>
                      <span>+ ₹{urgentFee}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Reward Point Discount</span>
                        <span>- ₹{discount}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-3 border-t border-[#0d2d50]/70 font-syne font-bold text-lg text-white">
                      <span>Total Invoice Due</span>
                      <span className="text-2xl text-[#1a6fff]">₹{total}</span>
                    </div>
                  </div>

                  <button
                    onClick={submitOrderAction}
                    disabled={loading}
                    className="w-full bg-[#1a6fff] hover:bg-[#1558cc] text-white py-3.5 rounded-xl font-bold text-base cursor-pointer shadow-lg shadow-[#1a6fff]/30 duration-200 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Submitting Order...' : 'Confirm & Place Order'}
                  </button>

                  <p className="text-center text-[10px] text-[#7da3cc] max-w-[400px] mx-auto leading-relaxed">
                    📱 Upon confirming, you will be redirected to WhatsApp to submit references or papers. Your order details are logged in real-time.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Footer */}
          <div className="bg-[#040e1c] border-t border-[#0d2d50] p-4.5 flex justify-between">
            <button
              onClick={prevStep}
              disabled={step === 1}
              className="px-5 py-2 rounded-lg text-xs font-semibold border border-[#0d2d50] text-[#7da3cc] hover:text-white hover:border-[#1a6fff]/50 cursor-pointer disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Previous
            </button>
            
            {step < 7 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2 rounded-lg text-xs font-semibold bg-[#1a6fff] text-white hover:bg-[#1558cc] cursor-pointer shadow-md shadow-[#1a6fff]/10 flex items-center gap-1.5"
              >
                Next Step
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <span></span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
