import { motion } from 'motion/react';
import { Sparkles, Calendar, Award, ShieldCheck, PhoneCall } from 'lucide-react';

interface HeroProps {
  onStartOrder: () => void;
}

export default function Hero({ onStartOrder }: HeroProps) {
  const handleWhatsAppOrder = () => {
    const msg = encodeURIComponent(
      "Hi Assign Me! I would like to place an assignment order directly. Please guide me on the process."
    );
    window.open(`https://wa.me/916374030823?text=${msg}`, '_blank');
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-between px-6 md:px-14 lg:px-20 py-20 overflow-hidden bg-[#020b18]">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-gradient-to-br from-[#1a6fff]/10 to-transparent rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-50px] left-[-50px] w-[400px] h-[400px] bg-gradient-to-tr from-[#00cfff]/5 to-transparent rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-[620px] z-10">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 bg-[#1a6fff]/10 border border-[#1a6fff]/20 text-[#1a6fff] rounded-full px-4 py-1.5 text-xs font-semibold mb-6 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          Assign Me — Writing Services Redefined
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-syne text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.1] mb-6"
        >
          Assign Me —<br />
          Because Assignments<br />
          <span className="text-[#1a6fff] bg-clip-text">Shouldn't Stress You.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[#7da3cc] text-base md:text-lg leading-relaxed mb-10 max-w-[500px]"
        >
          We turn your hand-written assignment tasks, laboratory manuals, and engineering drafts into top-scoring submissions. Simple wizard, perfect result.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap gap-4"
        >
          <button
            onClick={onStartOrder}
            className="bg-[#1a6fff] hover:bg-[#1558cc] text-white font-bold px-8 py-4 rounded-xl text-base shadow-lg shadow-[#1a6fff]/30 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            Start Order Wizard
          </button>
          
          <button
            onClick={handleWhatsAppOrder}
            className="bg-[#25d366] hover:bg-[#20ba56] text-white font-bold px-6 py-4 rounded-xl text-base flex items-center gap-2.5 transition-all duration-300 hover:scale-[1.02] cursor-pointer shadow-lg shadow-[#25d366]/10"
          >
            <PhoneCall className="w-5 h-5" />
            Direct WhatsApp Order
          </button>
        </motion.div>

        {/* Feature badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="grid grid-cols-2 gap-4 mt-12 max-w-[480px]"
        >
          <div className="flex items-center gap-2.5 text-xs text-[#7da3cc]">
            <div className="w-8 h-8 rounded-lg bg-[#071628] border border-[#0d2d50] flex items-center justify-center text-sm">⚡</div>
            <span>Simple 7-Step Process</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[#7da3cc]">
            <div className="w-8 h-8 rounded-lg bg-[#071628] border border-[#0d2d50] flex items-center justify-center text-sm">🚀</div>
            <span>Strict On-Time Delivery</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[#7da3cc]">
            <div className="w-8 h-8 rounded-lg bg-[#071628] border border-[#0d2d50] flex items-center justify-center text-sm">⭐</div>
            <span>Pristine Writing Quality</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[#7da3cc]">
            <div className="w-8 h-8 rounded-lg bg-[#071628] border border-[#0d2d50] flex items-center justify-center text-sm">🔒</div>
            <span>100% Secure & Confidential</span>
          </div>
        </motion.div>
      </div>

      {/* Floating Graphic Notebook Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="hidden lg:flex relative items-center justify-center w-[400px] h-[400px] mr-10"
      >
        <div className="absolute inset-0 border border-[#1a6fff]/10 rounded-full animate-ping opacity-30 duration-3000" />
        <div className="absolute w-[360px] h-[360px] border border-[#1a6fff]/15 rounded-full animate-pulse" />
        
        {/* Animated notebook shape */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-[280px] h-[280px] bg-gradient-to-br from-[#071628] to-[#0a1f38] border border-[#0d2d50] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#1a6fff]/15"
        >
          <div className="absolute inset-4 border border-[#1a6fff]/5 rounded-2xl bg-repeating-linear-gradient opacity-10"
               style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 24px, #1a6fff 25px)' }} />
          
          <div className="font-syne text-6xl font-extrabold text-[#1a6fff] drop-shadow-[0_0_35px_rgba(26,111,255,0.6)]">
            AM
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
