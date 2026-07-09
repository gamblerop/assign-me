import { motion } from 'motion/react';

export default function Pricing() {
  const cards = [
    {
      title: 'A4 Assignment',
      price: '₹10',
      unit: '/page',
      features: ['Neat & Clear Handwriting', 'On-Time Scheduled Delivery', 'Affordable B&W Transcription'],
      tag: 'Most Popular'
    },
    {
      title: 'A3 Sheets',
      price: '₹30',
      unit: '/sheet',
      features: ['Premium Sturdy Grid/Plain Sheets', 'Vivid Drawing Precision', 'Excellent Lab Transcripts'],
      tag: 'Best for Labs'
    },
    {
      title: 'Lab Manuals',
      price: '₹40',
      unit: '/experiment',
      features: ['Full Subject Experiment Completion', 'Chemistry, EGD, Physics & Mechanical', 'Complete Diagrams & Values'],
      tag: 'Comprehensive'
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-[#020b18] border-t border-[#0d2d50]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-syne text-3xl md:text-4xl font-extrabold text-white mb-4">
            Transparent Pricing Structure
          </h2>
          <p className="text-[#7da3cc] text-sm md:text-base max-w-[550px] mx-auto">
            Pay only for the pages or experiments you need. No hidden fees or commissions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto justify-center">
          {cards.map((card, idx) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-[#071628] border border-[#0d2d50] hover:border-[#1a6fff] rounded-2xl p-8 transition-all duration-300 flex flex-col relative overflow-hidden group hover:shadow-xl hover:shadow-[#1a6fff]/5"
            >
              {idx === 0 && (
                <div className="absolute top-0 right-0 bg-[#1a6fff] text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-bl-xl">
                  {card.tag}
                </div>
              )}
              {idx > 0 && (
                <div className="absolute top-0 right-0 bg-[#0d2d50] text-[#7da3cc] text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-bl-xl">
                  {card.tag}
                </div>
              )}

              <h3 className="font-syne text-lg font-bold text-white mb-2">{card.title}</h3>
              <div className="text-xs text-[#7da3cc] mb-4">Standard Base Price</div>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-syne text-4xl font-extrabold text-[#1a6fff]">{card.price}</span>
                <span className="text-[#7da3cc] text-sm">{card.unit}</span>
              </div>

              <ul className="space-y-3 flex-grow border-t border-[#0d2d50] pt-6">
                {card.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-xs text-[#7da3cc]">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
