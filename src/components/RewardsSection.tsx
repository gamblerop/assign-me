import { useState } from 'react';
import { Gift, Copy, Award, Heart, Share2, ClipboardCheck } from 'lucide-react';

interface RewardsSectionProps {
  userProfile: any;
  onLoginClick: () => void;
}

export default function RewardsSection({ userProfile, onLoginClick }: RewardsSectionProps) {
  const [copied, setCopy] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCopyLink = () => {
    const slug = (userProfile?.name || 'user').replace(/\s+/g, '').toLowerCase() + '2025';
    const link = `https://assignme.in/ref/${slug}`;
    navigator.clipboard.writeText(link);
    setCopy(true);
    setTimeout(() => setCopy(false), 2000);
  };

  return (
    <section id="rewards" className="py-20 bg-[#020b18] border-t border-[#0d2d50]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-syne text-3xl md:text-4xl font-extrabold text-white mb-4">
            Assign Me Rewards &amp; Referrals
          </h2>
          <p className="text-[#7da3cc] text-sm md:text-base max-w-[550px] mx-auto">
            Earn points every time you place an order, write reviews, or invite friends to use our transcription services.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Main User Dashboard Cards */}
          {userProfile ? (
            <div className="bg-[#071628] border border-[#0d2d50] rounded-2xl p-6 flex flex-col justify-between">
              <div className="flex items-center gap-4 border-b border-[#0d2d50]/60 pb-5 mb-5">
                <div className="w-14 h-14 rounded-full bg-[#1a6fff] text-white flex items-center justify-center font-syne font-extrabold text-xl shadow-lg shadow-[#1a6fff]/10">
                  {getInitials(userProfile.name)}
                </div>
                <div>
                  <h3 className="font-syne text-base font-bold text-white">{userProfile.name}</h3>
                  <div className="text-xs text-[#7da3cc] mt-0.5">{userProfile.email}</div>
                </div>
                <div className="ml-auto bg-[#1a6fff]/10 border border-[#1a6fff]/20 text-[#1a6fff] rounded-lg px-3.5 py-1 text-xs font-semibold">
                  Active Student
                </div>
              </div>

              {/* Stats grids */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-[#040f1e] border border-[#0d2d50]/70 rounded-xl p-4">
                  <div className="text-[#7da3cc] text-[10px] uppercase font-bold tracking-wider mb-1">Points Balance</div>
                  <div className="font-syne text-2xl font-extrabold text-white">{userProfile.points || 0}</div>
                </div>
                <div className="bg-[#040f1e] border border-[#0d2d50]/70 rounded-xl p-4">
                  <div className="text-[#7da3cc] text-[10px] uppercase font-bold tracking-wider mb-1">Deduct Value</div>
                  <div className="font-syne text-2xl font-extrabold text-emerald-400">₹{Math.floor((userProfile.points || 0) / 10)}</div>
                </div>
                <div className="bg-[#040f1e] border border-[#0d2d50]/70 rounded-xl p-4">
                  <div className="text-[#7da3cc] text-[10px] uppercase font-bold tracking-wider mb-1">Total Orders</div>
                  <div className="font-syne text-2xl font-extrabold text-sky-400">{userProfile.ordersCount || 0}</div>
                </div>
              </div>

              <div className="text-[10px] text-[#7da3cc] mt-4 text-center leading-relaxed">
                * Note: Every 10 reward points can be redeemed as ₹1 discount on your future assignment orders.
              </div>
            </div>
          ) : (
            <div className="bg-[#071628] border border-dashed border-[#0d2d50] rounded-2xl p-8 flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="font-syne text-lg font-bold text-white mb-2">Login to see your rewards</h3>
              <p className="text-[#7da3cc] text-xs max-w-[340px] leading-relaxed mb-6">
                Your total loyalty points, discount metrics, and points ledger history appear here once authenticated.
              </p>
              <button
                onClick={onLoginClick}
                className="bg-[#1a6fff] hover:bg-[#1558cc] text-white font-semibold text-xs px-6 py-3 rounded-xl cursor-pointer duration-200"
              >
                Sign In / Register Account
              </button>
            </div>
          )}

          {/* Referral links */}
          <div className="bg-[#071628] border border-[#0d2d50] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-syne text-base font-bold text-white flex items-center gap-2 mb-3">
                <Gift className="text-pink-500 w-5 h-5" />
                Invite Friends, Earn Bonus
              </h3>
              <p className="text-[#7da3cc] text-xs leading-relaxed mb-5">
                Share your personalized referral code link with your batchmates. Earn <strong className="text-emerald-400 font-bold">+100 reward points</strong> as soon as they complete their first assignment order!
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-[#040f1e] border border-[#0d2d50] rounded-xl p-4">
                <div className="text-[10px] font-bold text-[#7da3cc] uppercase tracking-wider mb-2">
                  Your Referral Link
                </div>
                <div className="flex gap-2">
                  <div className="flex-grow bg-[#020b18] border border-[#0d2d50]/70 rounded-lg p-2.5 text-[#7da3cc] text-xs font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                    {userProfile
                      ? `https://assignme.in/ref/${(userProfile.name || 'user').replace(/\s+/g, '').toLowerCase()}2025`
                      : 'https://assignme.in/ref/sign-in-to-generate-link'}
                  </div>
                  <button
                    onClick={userProfile ? handleCopyLink : onLoginClick}
                    className="bg-[#1a6fff] hover:bg-[#1558cc] text-white rounded-lg px-4 flex items-center gap-1.5 text-xs font-semibold cursor-pointer duration-200"
                  >
                    {copied ? (
                      <>
                        <ClipboardCheck className="w-4 h-4 text-emerald-300" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Static ways to earn */}
        <div className="max-w-4xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#071628]/60 border border-[#0d2d50]/50 rounded-xl p-4.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1a6fff]/10 flex items-center justify-center text-lg">🛒</div>
            <div>
              <div className="text-white text-xs font-bold font-syne">Place Any Order</div>
              <div className="text-[#7da3cc] text-[10px] mt-0.5">Earn +50 points upon order completion</div>
            </div>
          </div>
          <div className="bg-[#071628]/60 border border-[#0d2d50]/50 rounded-xl p-4.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center text-lg">🤝</div>
            <div>
              <div className="text-white text-xs font-bold font-syne">Refer Batchmates</div>
              <div className="text-[#7da3cc] text-[10px] mt-0.5">Earn +100 points per verified sign-up</div>
            </div>
          </div>
          <div className="bg-[#071628]/60 border border-[#0d2d50]/50 rounded-xl p-4.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#00e87a]/10 flex items-center justify-center text-lg">⭐</div>
            <div>
              <div className="text-white text-xs font-bold font-syne">Submit Feedback</div>
              <div className="text-[#7da3cc] text-[10px] mt-0.5">Earn +20 points per written review</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
