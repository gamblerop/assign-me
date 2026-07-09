import React, { useState, useEffect } from 'react';
import { submitReview } from '../services/dbService';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Review } from '../types';
import { Star, MessageSquare, ShieldCheck, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReviewSectionProps {
  userProfile: any;
  onLoginClick: () => void;
}

export default function ReviewSection({ userProfile, onLoginClick }: ReviewSectionProps) {
  const [stars, setStars] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [receivedOrder, setReceivedOrder] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Real-time listener for reviews
  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('date', 'desc'), limit(12));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const revList: Review[] = [];
      snapshot.forEach((doc) => {
        revList.push({ id: doc.id, ...doc.data() } as Review);
      });
      setReviews(revList);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stars === 0) {
      alert('Please select a star rating.');
      return;
    }
    if (!reviewText.trim()) {
      alert('Please enter your review text.');
      return;
    }

    setLoading(true);
    try {
      await submitReview({
        name: userProfile ? userProfile.name : 'Guest User',
        userId: userProfile ? userProfile.id : 'guest',
        stars,
        text: reviewText,
        received: receivedOrder,
      });

      setSuccess(true);
      setStars(0);
      setReviewText('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      alert('Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  const staticReviews = [
    {
      id: 'static1',
      name: 'Priya S.',
      stars: 5,
      text: 'Super fast delivery! Got my A4 chemistry assignment done overnight. The handwriting was clean and matched standard block print letters.',
      date: '12 Apr 2025',
      received: true
    },
    {
      id: 'static2',
      name: 'Rahul M.',
      stars: 5,
      text: 'The laboratory semiconductor manual was completely accurate — all diagrams, graphs and readings were filled. Best value for students!',
      date: '15 Apr 2025',
      received: true
    },
    {
      id: 'static3',
      name: 'Ananya K.',
      stars: 4,
      text: 'Good writing and easy delivery. The points reward discount actually saved me ₹50 on my second lab drawing sheet. Highly responsive team.',
      date: '20 Apr 2025',
      received: true
    }
  ];

  const getInitials = (name: string) => {
    return (name || '?')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const avColors = ['bg-[#1a6fff]', 'bg-pink-500', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500', 'bg-cyan-500'];

  return (
    <section id="reviews" className="py-20 bg-[#040f1e] border-t border-[#0d2d50]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-syne text-3xl md:text-4xl font-extrabold text-white mb-4">
            Student Reviews &amp; Experiences
          </h2>
          <p className="text-[#7da3cc] text-sm md:text-base max-w-[550px] mx-auto">
            Received your manual or sheet? Leave feedback to earn <strong className="text-[#ffc940]">+20 points</strong> bonus!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Submit Review Card */}
          <div className="lg:col-span-1 bg-[#071628] border border-[#0d2d50] rounded-2xl p-6 h-fit shadow-lg">
            <h3 className="font-syne text-base font-bold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#1a6fff]" />
              Write a Review
            </h3>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center space-y-3.5"
                >
                  <div className="text-4xl">🎉</div>
                  <h4 className="font-syne text-sm font-bold text-emerald-400">Review Submitted!</h4>
                  <p className="text-[#7da3cc] text-xs">
                    Thank you! Your feedback has been posted. You earned <strong className="text-emerald-400">+20 reward points</strong>!
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Star Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-[#7da3cc] mb-1.5 uppercase tracking-wider">
                      Your Rating
                    </label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setStars(idx)}
                          className="hover:scale-115 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-7 h-7 ${
                              idx <= stars
                                ? 'text-[#ffc940] fill-[#ffc940]'
                                : 'text-[#0d2d50] hover:text-[#ffc940]/50'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Receipt verification */}
                  <div>
                    <label className="block text-xs font-semibold text-[#7da3cc] mb-1.5 uppercase tracking-wider">
                      Did you receive your order?
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setReceivedOrder(true)}
                        className={`py-2 rounded-lg text-xs font-semibold cursor-pointer border ${
                          receivedOrder
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                            : 'border-[#0d2d50] bg-transparent text-[#7da3cc]'
                        }`}
                      >
                        Yes, Delivered ✅
                      </button>
                      <button
                        type="button"
                        onClick={() => setReceivedOrder(false)}
                        className={`py-2 rounded-lg text-xs font-semibold cursor-pointer border ${
                          !receivedOrder
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                            : 'border-[#0d2d50] bg-transparent text-[#7da3cc]'
                        }`}
                      >
                        Not Yet ⏳
                      </button>
                    </div>
                  </div>

                  {/* Textarea */}
                  <div>
                    <label className="block text-xs font-semibold text-[#7da3cc] mb-1.5 uppercase tracking-wider">
                      Your Comments
                    </label>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Comment on writing quality, delivery speed, handwriting neatness..."
                      rows={4}
                      className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl p-3 text-white text-xs focus:outline-none focus:border-[#1a6fff] resize-none"
                    />
                  </div>

                  {userProfile ? (
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#1a6fff] hover:bg-[#1558cc] text-white py-3 rounded-xl text-xs font-bold shadow-md shadow-[#1a6fff]/20 transition-all duration-200 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? 'Submitting...' : 'Submit review'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onLoginClick}
                      className="w-full bg-[#0a1f38] border border-[#0d2d50] hover:border-[#1a6fff] text-[#7da3cc] hover:text-white py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer"
                    >
                      Sign In to Review &amp; Earn points
                    </button>
                  )}
                </form>
              )}
            </AnimatePresence>
          </div>

          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-syne text-base font-bold text-white mb-2 flex items-center gap-2">
              <Star className="w-5 h-5 text-[#ffc940]" />
              Verified Feedbacks
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Render dynamic snapshot reviews, or fallback to static ones */}
              {reviews.length > 0
                ? reviews.map((rev, idx) => (
                    <div
                      key={rev.id}
                      className="bg-[#071628] border border-[#0d2d50] rounded-2xl p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex gap-0.5 mb-2.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < rev.stars ? 'text-[#ffc940] fill-[#ffc940]' : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[#e8f0fe] text-xs leading-relaxed italic mb-4">
                          "{rev.text}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 border-t border-[#0d2d50]/40 pt-3">
                        <div className={`w-8 h-8 rounded-full ${avColors[idx % avColors.length]} text-white text-xs font-bold flex items-center justify-center`}>
                          {getInitials(rev.name)}
                        </div>
                        <div>
                          <div className="text-white font-semibold text-xs">{rev.name}</div>
                          <div className="text-[10px] text-[#7da3cc] mt-0.5 flex items-center gap-1.5">
                            <span>{rev.date}</span>
                            <span>•</span>
                            <span className={rev.received ? 'text-emerald-400' : 'text-amber-400'}>
                              {rev.received ? 'Delivered' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                : staticReviews.map((rev, idx) => (
                    <div
                      key={rev.id}
                      className="bg-[#071628] border border-[#0d2d50] rounded-2xl p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex gap-0.5 mb-2.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < rev.stars ? 'text-[#ffc940] fill-[#ffc940]' : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[#e8f0fe] text-xs leading-relaxed italic mb-4">
                          "{rev.text}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 border-t border-[#0d2d50]/40 pt-3">
                        <div className={`w-8 h-8 rounded-full ${avColors[idx % avColors.length]} text-white text-xs font-bold flex items-center justify-center`}>
                          {getInitials(rev.name)}
                        </div>
                        <div>
                          <div className="text-white font-semibold text-xs">{rev.name}</div>
                          <div className="text-[10px] text-[#7da3cc] mt-0.5 flex items-center gap-1.5">
                            <span>{rev.date}</span>
                            <span>•</span>
                            <span className="text-emerald-400">Delivered</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
