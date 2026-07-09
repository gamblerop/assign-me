import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs, where, writeBatch } from 'firebase/firestore';
import { updateOrderStatus } from '../services/dbService';
import { Order, Review, UserProfile } from '../types';
import {
  X, Search, ShieldAlert, Award, Star, Mail, Phone, Calendar,
  BarChart, ArrowLeft, Trash2, Check, RefreshCw, AlertTriangle,
  Menu, Bell, Shield, DollarSign, Activity, FileText, CheckCircle2,
  SlidersHorizontal, Sparkles, Filter, ChevronRight, UserCheck, Image, MessageSquare, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPortalProps {
  onBackToClient: () => void;
}

export default function AdminPortal({ onBackToClient }: AdminPortalProps) {
  // Authentication verified via Parent page (sessionStorage check)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'customers' | 'photos' | 'reviews'>('dashboard');

  // Real-time Collections Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<any[]>([]);

  // Search & Filter UI States
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'All' | 'Pending' | 'In Progress' | 'Completed' | 'Rejected'>('All');
  const [customerSearch, setCustomerSearch] = useState('');
  const [reviewSearch, setReviewSearch] = useState('');
  const [photoSearch, setPhotoSearch] = useState('');

  // Floating Notifications Feed
  const [liveToast, setLiveToast] = useState<string | null>(null);

  // Statistics
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    inProgress: 0,
    completed: 0,
    revenue: 0,
    totalPoints: 0
  });

  // Verify Session Storage Authenticated State on load
  useEffect(() => {
    const isAuth = sessionStorage.getItem('adminAuth') === 'true';
    if (isAuth) {
      setIsAdminAuthenticated(true);
    } else {
      // If no admin authentication in session, bounce back
      onBackToClient();
    }
  }, [onBackToClient]);

  // Establish Real-Time Subscriptions to Database Collections
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    // 1. Live Orders sync
    const unsubscribeOrders = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => {
        const orderList: Order[] = [];
        let pending = 0;
        let progress = 0;
        let done = 0;
        let rev = 0;
        snap.forEach((doc) => {
          const o = { id: doc.id, ...doc.data() } as Order;
          orderList.push(o);
          if (o.status === 'Pending') pending++;
          if (o.status === 'In Progress') progress++;
          if (o.status === 'Completed') {
            done++;
            rev += o.total;
          }
        });

        // Trigger a subtle toast on database update
        if (orders.length > 0 && orderList.length !== orders.length) {
          setLiveToast('🔔 Orders database updated in real-time');
          setTimeout(() => setLiveToast(null), 3500);
        }

        setOrders(orderList);
        setStats(prev => ({
          ...prev,
          totalOrders: orderList.length,
          pendingOrders: pending,
          inProgress: progress,
          completed: done,
          revenue: rev
        }));
      },
      (err) => console.error('Orders sync failed:', err)
    );

    // 2. Live Customers sync
    const unsubscribeCustomers = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'user')),
      (snap) => {
        const list: UserProfile[] = [];
        let totalPts = 0;
        snap.forEach((doc) => {
          const u = { id: doc.id, ...doc.data() } as UserProfile;
          list.push(u);
          totalPts += u.points || 0;
        });
        setCustomers(list);
        setStats(prev => ({ ...prev, totalPoints: totalPts }));
      },
      (err) => console.error('Customers sync failed:', err)
    );

    // 3. Live Reviews sync
    const unsubscribeReviews = onSnapshot(
      query(collection(db, 'reviews'), orderBy('date', 'desc')),
      (snap) => {
        const list: Review[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Review);
        });
        setReviews(list);
      },
      (err) => console.error('Reviews sync failed:', err)
    );

    // 4. Live Reference Photos sync
    const unsubscribePhotos = onSnapshot(
      query(collection(db, 'uploaded_photos'), orderBy('createdAt', 'desc')),
      (snap) => {
        const list: any[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setUploadedPhotos(list);
      },
      (err) => console.error('Photos sync failed:', err)
    );

    return () => {
      unsubscribeOrders();
      unsubscribeCustomers();
      unsubscribeReviews();
      unsubscribePhotos();
    };
  }, [isAdminAuthenticated, orders.length]);

  // Operational Action Handlers
  const handleUpdateStatus = async (orderId: string, status: Order['status']) => {
    try {
      await updateOrderStatus(orderId, status);
      setLiveToast(`✓ Order status set to ${status}`);
      setTimeout(() => setLiveToast(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to permanently delete this order? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setLiveToast('🗑 Order deleted successfully');
      setTimeout(() => setLiveToast(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Deletion failed.');
    }
  };

  const handleDeletePhoto = async (id: string) => {
    if (!confirm('Delete this uploaded reference image?')) return;
    try {
      await deleteDoc(doc(db, 'uploaded_photos', id));
      setLiveToast('🗑 Reference photo deleted');
      setTimeout(() => setLiveToast(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const clearAllAppLogs = async () => {
    if (!confirm('🚨 CRITICAL WARNING: This will permanently purge all database records for orders, reference images, and user reviews from Firestore. Proceed?')) return;
    try {
      const collections = ['orders', 'uploaded_photos', 'reviews'];
      for (const col of collections) {
        const snap = await getDocs(collection(db, col));
        const batch = writeBatch(db);
        snap.forEach((d) => {
          batch.delete(doc(db, col, d.id));
        });
        await batch.commit();
      }
      alert('All transaction databases successfully purged and reset.');
    } catch (err) {
      console.error(err);
    }
  };

  // Perform secure log out
  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    onBackToClient();
  };

  // Search/Filters calculations
  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.name.toLowerCase().includes(orderSearch.toLowerCase()) || 
                          o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
                          o.service.toLowerCase().includes(orderSearch.toLowerCase());
    const matchesFilter = orderFilter === 'All' ? true : o.status === orderFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredCustomers = customers.filter(c => {
    return c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
           c.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
           (c.phone && c.phone.includes(customerSearch));
  });

  const filteredPhotos = uploadedPhotos.filter(p => {
    return (p.name && p.name.toLowerCase().includes(photoSearch.toLowerCase())) ||
           (p.note && p.note.toLowerCase().includes(photoSearch.toLowerCase())) ||
           (p.fileName && p.fileName.toLowerCase().includes(photoSearch.toLowerCase()));
  });

  const filteredReviews = reviews.filter(r => {
    return r.name.toLowerCase().includes(reviewSearch.toLowerCase()) ||
           r.text.toLowerCase().includes(reviewSearch.toLowerCase());
  });

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-[#020712] flex items-center justify-center p-6 text-center">
        <div className="space-y-4 max-w-sm">
          <RefreshCw className="w-8 h-8 text-[#1a6fff] animate-spin mx-auto" />
          <h3 className="font-syne text-lg font-bold text-white">Verifying Admin Session</h3>
          <p className="text-[#7da3cc] text-xs">Access is authorized for verified administrator email only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020813] text-[#e2ecf8] flex flex-col md:flex-row font-sans w-full selection:bg-[#1a6fff]/30 selection:text-white">
      
      {/* Dynamic Sync Toast */}
      <AnimatePresence>
        {liveToast && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed bottom-6 right-6 bg-[#071930] border border-[#1a6fff]/30 px-4 py-3 rounded-xl shadow-xl shadow-black/40 text-xs text-[#99c5f5] font-semibold flex items-center gap-2.5 z-[9999]"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {liveToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Sidebar Navigation */}
      <aside className="w-full md:w-[240px] bg-[#040e1b] border-r border-[#0d2644] flex flex-col justify-between h-auto md:h-screen sticky top-0 z-[50]">
        <div>
          {/* Header */}
          <div className="flex items-center gap-3 p-5 border-b border-[#0d2644]/70">
            <div className="w-9 h-9 bg-gradient-to-tr from-[#1a6fff] to-[#458eff] text-white rounded-xl flex items-center justify-center font-syne font-extrabold text-sm shadow-lg shadow-[#1a6fff]/20">
              AM
            </div>
            <div>
              <div className="font-syne font-extrabold text-sm tracking-wide text-white flex items-center gap-1.5">
                ADMIN PORTAL
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Database Sync Active
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {[
              { id: 'dashboard', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
              { id: 'orders', label: 'All Orders', icon: <FileText className="w-4 h-4" />, count: orders.length },
              { id: 'customers', label: 'Customers', icon: <Shield className="w-4 h-4" />, count: customers.length },
              { id: 'photos', label: 'References', icon: <Image className="w-4 h-4" />, count: uploadedPhotos.length },
              { id: 'reviews', label: 'Reviews', icon: <Star className="w-4 h-4" />, count: reviews.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-[#1a6fff] text-white shadow-md shadow-[#1a6fff]/15'
                    : 'text-[#7da3cc] hover:bg-[#071628] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  {tab.icon}
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
                    activeTab === tab.id ? 'bg-white/15 text-white' : 'bg-[#0a1f38] text-[#7da3cc]'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Footer Area with Utilities */}
        <div className="p-4 border-t border-[#0d2644]/50 space-y-2">
          <button
            onClick={clearAllAppLogs}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/5 hover:bg-red-500/15 text-red-400 text-xs font-semibold rounded-xl border border-red-500/10 hover:border-red-500/20 cursor-pointer duration-200"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Purge All Data
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-[#0a1f38] hover:bg-[#0c2544] text-[#86b5e7] hover:text-white border border-[#0d2d50] rounded-xl text-xs font-semibold cursor-pointer duration-200"
          >
            Logout Securely
          </button>

          <button
            onClick={onBackToClient}
            className="w-full text-center text-[#7da3cc] hover:text-white text-[11px] flex items-center justify-center gap-1 cursor-pointer hover:underline pt-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to client
          </button>
        </div>
      </aside>

      {/* Main Panel Content Stage */}
      <main className="flex-grow p-6 md:p-8 space-y-8 h-screen overflow-y-auto bg-gradient-to-b from-[#020813] to-[#01040a]">
        
        {/* TOP METRICS BENTO GRID */}
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <div className="text-[10px] text-[#1a6fff] font-bold tracking-widest uppercase mb-1">Administrative Console</div>
              <h1 className="font-syne text-2xl md:text-3xl font-extrabold text-white tracking-tight">System Ledger</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#7da3cc] font-medium hidden md:inline">
                Secure Session: <strong className="text-white font-semibold">gamblerop18@gmail.com</strong>
              </span>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Submissions Total', val: stats.totalOrders, detail: 'Cumulative requests', color: 'text-white' },
              { label: 'Pending Queue', val: stats.pendingOrders, detail: 'Awaiting transcription', color: 'text-[#ffc940]' },
              { label: 'In Progress', val: stats.inProgress, detail: 'Assigned writers active', color: 'text-[#a78bfa]' },
              { label: 'Settled Revenue', val: `₹${stats.revenue}`, detail: 'From completed jobs', color: 'text-[#00e87a]' }
            ].map((card, i) => (
              <div key={i} className="bg-gradient-to-b from-[#06162a] to-[#041021] border border-[#0d2d50] hover:border-[#1a6fff]/30 rounded-2xl p-5 relative overflow-hidden transition-all duration-300 group hover:-translate-y-0.5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#1a6fff]/3 rounded-full blur-xl group-hover:bg-[#1a6fff]/6 transition-all"></div>
                <div className="text-xs text-[#7da3cc] font-bold uppercase tracking-wider mb-2">{card.label}</div>
                <div className={`font-syne text-3xl font-extrabold ${card.color} tracking-tight`}>{card.val}</div>
                <div className="text-[10px] text-[#7da3cc] mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[#1a6fff]"></span>
                  {card.detail}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ACTIVE PORTAL TAB */}
        <AnimatePresence mode="wait">
          
          {/* TAB: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="tab-dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Premium Analytics SVG Chart Panel */}
              <div className="bg-gradient-to-b from-[#06162a] to-[#041021] border border-[#0d2d50] rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="font-syne text-base font-bold text-white flex items-center gap-2">
                      <BarChart className="w-5 h-5 text-[#1a6fff]" />
                      Performance Trend &amp; Revenue Analytics
                    </h3>
                    <p className="text-[#7da3cc] text-xs">Dynamic graph mapping system volume and earnings over recent slots.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] bg-[#00e87a]/15 text-[#00e87a] px-2.5 py-1 rounded-lg border border-[#00e87a]/10 font-bold">
                      Revenue Line
                    </span>
                    <span className="text-[10px] bg-[#1a6fff]/15 text-[#1a6fff] px-2.5 py-1 rounded-lg border border-[#1a6fff]/10 font-bold">
                      Orders Area
                    </span>
                  </div>
                </div>

                {/* SVG Graph Visualization */}
                <div className="w-full h-48 bg-[#020813]/40 border border-[#0d2d50]/40 rounded-xl p-2 relative overflow-hidden flex items-end">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1a6fff" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#1a6fff" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00e87a" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#00e87a" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    
                    {/* Grid Lines */}
                    <line x1="0" y1="25" x2="100" y2="25" stroke="#0d2d50" strokeWidth="0.2" strokeDasharray="2,2" />
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#0d2d50" strokeWidth="0.2" strokeDasharray="2,2" />
                    <line x1="0" y1="75" x2="100" y2="75" stroke="#0d2d50" strokeWidth="0.2" strokeDasharray="2,2" />

                    {/* Area path for Orders */}
                    <path d="M0 100 L 15 75 L 30 85 L 45 45 L 60 65 L 75 30 L 90 20 L 100 10 L 100 100 Z" fill="url(#chartGrad)" />
                    <path d="M0 100 L 15 75 L 30 85 L 45 45 L 60 65 L 75 30 L 90 20 L 100 10" fill="none" stroke="#1a6fff" strokeWidth="1" strokeLinecap="round" />

                    {/* Line path for Revenue */}
                    <path d="M0 90 L 15 80 L 30 75 L 45 60 L 60 45 L 75 25 L 90 15 L 100 5 L 100 100 Z" fill="url(#revGrad)" />
                    <path d="M0 90 L 15 80 L 30 75 L 45 60 L 60 45 L 75 25 L 90 15 L 100 5" fill="none" stroke="#00e87a" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  
                  {/* Axis Tags */}
                  <div className="absolute left-3 bottom-3 text-[9px] font-mono text-[#7da3cc]">Mon</div>
                  <div className="absolute left-1/4 bottom-3 text-[9px] font-mono text-[#7da3cc]">Wed</div>
                  <div className="absolute left-1/2 bottom-3 text-[9px] font-mono text-[#7da3cc]">Fri</div>
                  <div className="absolute right-3 bottom-3 text-[9px] font-mono text-[#7da3cc]">Today</div>
                </div>
              </div>

              {/* Instant Action Pending Grid */}
              <div className="bg-[#051325] border border-[#0d2d50] rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <h3 className="font-syne text-base font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#ffc940]" />
                    Queue Dispatch Center
                  </h3>
                  <button 
                    onClick={() => setActiveTab('orders')} 
                    className="text-[#1a6fff] text-xs hover:underline flex items-center gap-1 font-semibold"
                  >
                    View all ledger <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#0d2d50] text-[#7da3cc] font-semibold">
                        <th className="py-3 px-3 text-center">Dispatch</th>
                        <th className="py-3 px-3">Order Specs</th>
                        <th className="py-3 px-3">Student Customer</th>
                        <th className="py-3 px-3">Target Date</th>
                        <th className="py-3 px-3">Delivery Drop</th>
                        <th className="py-3 px-3 text-right">Invoiced</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.filter(o => o.status !== 'Completed' && o.status !== 'Rejected').length > 0 ? (
                        orders
                          .filter(o => o.status !== 'Completed' && o.status !== 'Rejected')
                          .slice(0, 5)
                          .map((o) => (
                            <tr key={o.id} className="border-b border-[#0d2d50]/50 hover:bg-[#1a6fff]/5 transition-colors">
                              <td className="py-3 px-3 text-center">
                                <button
                                  onClick={() => handleUpdateStatus(o.id, 'Completed')}
                                  title="Mark Completed"
                                  className="w-7 h-7 rounded-lg border border-[#0d2d50] hover:border-emerald-400 hover:bg-emerald-500/10 text-transparent hover:text-emerald-400 flex items-center justify-center cursor-pointer mx-auto transition-all duration-200"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </td>
                              <td className="py-3 px-3">
                                <div className="text-white font-bold">{o.service}</div>
                                <span className="text-[10px] text-[#7da3cc] block mt-0.5 font-mono">{o.id}</span>
                              </td>
                              <td className="py-3 px-3 text-white font-semibold">{o.name}</td>
                              <td className="py-3 px-3 text-[#7da3cc] font-medium">{o.deliveryDate}</td>
                              <td className="py-3 px-3">
                                <span className="text-white font-medium">
                                  {o.userType === 'Hosteller' ? '🏠 hostel ' + o.hostel : '🎒 delivery ' + o.delivery}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-white">₹{o.total}</td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#7da3cc]">
                            No pending assignments found. Perfect clearance slate! 🎉
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: ALL ORDERS LEDGER */}
          {activeTab === 'orders' && (
            <motion.div
              key="tab-orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Dynamic Search & Status Filter Panel */}
              <div className="bg-[#051325] border border-[#0d2d50] rounded-2xl p-5 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#7da3cc]" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by student, ID, category..."
                    className="w-full bg-[#030a16] border border-[#0d2d50] rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-[#7da3cc] focus:outline-none focus:border-[#1a6fff]"
                  />
                  {orderSearch && (
                    <button onClick={() => setOrderSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7da3cc] hover:text-white text-xs">
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                  <span className="text-[11px] text-[#7da3cc] font-bold flex items-center gap-1.5 whitespace-nowrap">
                    <Filter className="w-3.5 h-3.5" /> Filter State:
                  </span>
                  {(['All', 'Pending', 'In Progress', 'Completed', 'Rejected'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setOrderFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${
                        orderFilter === filter
                          ? 'bg-[#1a6fff] text-white'
                          : 'bg-[#030a16] border border-[#0d2d50] text-[#7da3cc] hover:text-white'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Ledger Table */}
              <div className="bg-[#051325] border border-[#0d2d50] rounded-2xl overflow-hidden p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#0d2d50] text-[#7da3cc] font-semibold">
                        <th className="py-3 px-3">Order ID</th>
                        <th className="py-3 px-3">Student Customer</th>
                        <th className="py-3 px-3">Type Specifications</th>
                        <th className="py-3 px-3">Style</th>
                        <th className="py-3 px-3">Drop details</th>
                        <th className="py-3 px-3">Target Slot</th>
                        <th className="py-3 px-3">Invoiced</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-center">Direct Controls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length > 0 ? (
                        filteredOrders.map((o) => (
                          <tr key={o.id} className="border-b border-[#0d2d50]/40 hover:bg-[#1a6fff]/4">
                            <td className="py-3.5 px-3 font-mono text-[#7da3cc] text-[10px] select-all">{o.id}</td>
                            <td className="py-3.5 px-3">
                              <div className="text-white font-bold">{o.name}</div>
                              <span className="text-[10px] text-[#7da3cc] block mt-0.5">{o.phone || 'No phone'}</span>
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="text-white font-medium">{o.service}</div>
                              <div className="text-[10px] text-[#7da3cc] mt-0.5">{o.qty} pages</div>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                o.handwriting === 'Printed' ? 'bg-[#1a6fff]/15 text-[#1a6fff] border border-[#1a6fff]/10' : 'bg-pink-500/15 text-pink-400 border border-pink-500/10'
                              }`}>
                                {o.handwriting}
                              </span>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="text-white font-medium text-[11px]">
                                {o.userType === 'Hosteller' ? '🏠 hostel ' + o.hostel : '🎒 delivery ' + o.delivery}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-[#7da3cc] font-medium">{o.deliveryDate}</td>
                            <td className="py-3.5 px-3 text-[#00e87a] font-bold">₹{o.total}</td>
                            <td className="py-3.5 px-3">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-extrabold border ${
                                o.status === 'Pending'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : o.status === 'In Progress'
                                  ? 'bg-blue-500/10 text-sky-400 border-blue-500/20'
                                  : o.status === 'Completed'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                {o.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="flex justify-center gap-1.5">
                                {o.status === 'Pending' && (
                                  <button
                                    onClick={() => handleUpdateStatus(o.id, 'In Progress')}
                                    title="Set In-Progress"
                                    className="p-1.5 bg-[#030a16] border border-[#0d2d50] hover:border-sky-400 text-[#7da3cc] hover:text-sky-400 rounded-lg cursor-pointer duration-150"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {o.status === 'In Progress' && (
                                  <button
                                    onClick={() => handleUpdateStatus(o.id, 'Completed')}
                                    title="Set Completed"
                                    className="p-1.5 bg-[#030a16] border border-[#0d2d50] hover:border-emerald-400 text-[#7da3cc] hover:text-emerald-400 rounded-lg cursor-pointer duration-150"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteOrder(o.id)}
                                  title="Delete Order"
                                  className="p-1.5 bg-[#030a16] border border-[#0d2d50] hover:border-red-500 text-[#7da3cc] hover:text-red-500 rounded-lg cursor-pointer duration-150"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-[#7da3cc]">
                            <div className="space-y-2">
                              <FileText className="w-8 h-8 text-slate-700 mx-auto" />
                              <p className="text-xs">No orders match the current filters or query.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: CUSTOMER DIRECTORY */}
          {activeTab === 'customers' && (
            <motion.div
              key="tab-customers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Customer search bar */}
              <div className="bg-[#051325] border border-[#0d2d50] rounded-2xl p-5">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#7da3cc]" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by student name or email..."
                    className="w-full bg-[#030a16] border border-[#0d2d50] rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-[#7da3cc] focus:outline-none focus:border-[#1a6fff]"
                  />
                </div>
              </div>

              {/* Customer user database */}
              <div className="bg-[#051325] border border-[#0d2d50] rounded-2xl overflow-hidden p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#0d2d50] text-[#7da3cc] font-semibold">
                        <th className="py-3 px-3">Account Reference</th>
                        <th className="py-3 px-3">Student Name</th>
                        <th className="py-3 px-3">Email Address</th>
                        <th className="py-3 px-3">WhatsApp Number</th>
                        <th className="py-3 px-3 text-center">Current Points Balance</th>
                        <th className="py-3 px-3 text-center">Total Completed Jobs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((c) => (
                          <tr key={c.id} className="border-b border-[#0d2d50]/40 hover:bg-[#1a6fff]/4">
                            <td className="py-3.5 px-3 font-mono text-[#7da3cc] text-[10px]">{c.id}</td>
                            <td className="py-3.5 px-3 text-white font-semibold flex items-center gap-2">
                              <div className="w-7 h-7 bg-[#1a6fff]/15 text-[#1a6fff] border border-[#1a6fff]/15 rounded-lg flex items-center justify-center font-bold font-syne text-[11px]">
                                {c.name.slice(0, 2).toUpperCase()}
                              </div>
                              {c.name}
                            </td>
                            <td className="py-3.5 px-3 text-[#7da3cc] font-medium select-all">{c.email}</td>
                            <td className="py-3.5 px-3 text-[#7da3cc] font-medium font-mono select-all">{c.phone || '—'}</td>
                            <td className="py-3.5 px-3 text-center">
                              <span className="px-2.5 py-1 rounded-xl bg-[#00e87a]/10 border border-[#00e87a]/20 text-[#00e87a] font-bold">
                                {c.points || 0} pts
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-white">{c.ordersCount || 0}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-[#7da3cc]">
                            <div className="space-y-2">
                              <Shield className="w-8 h-8 text-slate-700 mx-auto" />
                              <p className="text-xs">No customer records matching search parameters.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: UPLOADED PHOTOS REFERENCES */}
          {activeTab === 'photos' && (
            <motion.div
              key="tab-photos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Photo Search */}
              <div className="bg-[#051325] border border-[#0d2d50] rounded-2xl p-5 flex justify-between items-center flex-wrap gap-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#7da3cc]" />
                  <input
                    type="text"
                    value={photoSearch}
                    onChange={(e) => setPhotoSearch(e.target.value)}
                    placeholder="Search by student or file name..."
                    className="w-full bg-[#030a16] border border-[#0d2d50] rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-[#7da3cc] focus:outline-none focus:border-[#1a6fff]"
                  />
                </div>
                <div className="text-xs text-[#7da3cc] font-semibold">
                  References: <span className="text-white">{uploadedPhotos.length} files</span>
                </div>
              </div>

              {/* Photos Cards Grid */}
              {filteredPhotos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {filteredPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="bg-[#051325] border border-[#0d2d50] hover:border-[#1a6fff]/30 rounded-2xl overflow-hidden transition-all duration-300 group hover:-translate-y-0.5 shadow-md shadow-black/10"
                    >
                      <div className="relative overflow-hidden h-44">
                        <img
                          src={photo.dataUrl}
                          alt="Reference content"
                          className="w-full h-full object-cover cursor-zoom-in transition-all duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                          onClick={() => {
                            const ov = document.createElement('div');
                            ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
                            ov.innerHTML = `<img src="${photo.dataUrl}" style="max-width:90vw;max-height:90vh;border-radius:12px;box-shadow:0 0 60px rgba(0,0,0,0.8);">`;
                            ov.onclick = () => ov.remove();
                            document.body.appendChild(ov);
                          }}
                        />
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="absolute top-2.5 right-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg p-2 text-[10px] font-bold cursor-pointer transition-colors duration-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute top-2.5 left-2.5 bg-black/60 rounded-md px-2 py-1 text-[10px] text-[#7da3cc] font-mono">
                          {photo.size || 'Base64'}
                        </div>
                      </div>
                      <div className="p-4.5 space-y-2.5">
                        <div className="text-white text-xs font-bold flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-[#1a6fff]" />
                          <span>{photo.name || 'Anonymous Student'}</span>
                        </div>
                        {photo.note && (
                          <div className="text-[11px] text-[#86b5e7] bg-[#1a6fff]/10 rounded-xl p-3 border border-[#1a6fff]/5 leading-relaxed">
                            <strong className="text-white block text-[10px] uppercase font-bold tracking-wider mb-1">Student Note:</strong>
                            "{photo.note}"
                          </div>
                        )}
                        <div className="text-[10px] text-[#7da3cc] flex justify-between border-t border-[#0d2d50]/40 pt-3">
                          <span className="font-mono text-[9px] max-w-[120px] truncate">{photo.fileName}</span>
                          <span className="font-medium">{photo.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#051325] border border-dashed border-[#0d2d50] rounded-2xl p-12 text-center text-[#7da3cc]">
                  <Image className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs">No reference uploads found matching criteria.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB: REVIEWS MODERATION */}
          {activeTab === 'reviews' && (
            <motion.div
              key="tab-reviews"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Search Reviews bar */}
              <div className="bg-[#051325] border border-[#0d2d50] rounded-2xl p-5">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#7da3cc]" />
                  <input
                    type="text"
                    value={reviewSearch}
                    onChange={(e) => setReviewSearch(e.target.value)}
                    placeholder="Search by student review content..."
                    className="w-full bg-[#030a16] border border-[#0d2d50] rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-[#7da3cc] focus:outline-none focus:border-[#1a6fff]"
                  />
                </div>
              </div>

              {/* Reviews Cards List */}
              {filteredReviews.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {filteredReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-[#051325] border border-[#0d2d50] hover:border-[#1a6fff]/30 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300"
                    >
                      <div>
                        <div className="flex gap-0.5 mb-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < rev.stars ? 'text-[#ffc940] fill-[#ffc940]' : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[#e2ecf8] text-xs leading-relaxed italic mb-5">
                          "{rev.text}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 border-t border-[#0d2d50]/40 pt-3">
                        <div className="w-8 h-8 rounded-xl bg-[#1a6fff]/15 text-[#1a6fff] text-xs font-bold flex items-center justify-center">
                          {rev.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-grow">
                          <div className="text-white font-bold text-xs">{rev.name}</div>
                          <div className="text-[10px] text-[#7da3cc] mt-0.5 flex items-center justify-between">
                            <span>{rev.date}</span>
                            <span className={rev.received ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                              {rev.received ? '✓ Verified' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#051325] border border-dashed border-[#0d2d50] rounded-2xl p-12 text-center text-[#7da3cc]">
                  <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs">No reviews matching query registered.</p>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
