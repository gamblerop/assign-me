import { motion } from 'motion/react';

export default function HowItWorks() {
  const steps = [
    {
      num: '1',
      emoji: '📝',
      title: 'Place Your Order',
      desc: 'Fill out our interactive order wizard — select your user type, delivery details, and quantity sheets.',
      color: 'from-[#1a6fff] to-blue-500'
    },
    {
      num: '2',
      emoji: '✍️',
      title: 'We Handwrite It',
      desc: 'Our designated academic writers transcribe your drafts with beautiful, neat handwriting matching your style.',
      color: 'from-cyan-500 to-teal-500'
    },
    {
      num: '3',
      emoji: '🚀',
      title: 'Durable Delivery',
      desc: 'We deliver directly to your specific hostel room or the day scholar gate pick-up point on schedule.',
      color: 'from-emerald-500 to-green-500'
    }
  ];

  return (
    <section id="howitworks" className="py-20 bg-[#040f1e] border-t border-[#0d2d50]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-syne text-3xl md:text-4xl font-extrabold text-white mb-4">
            How It Works
          </h2>
          <p className="text-[#7da3cc] text-sm md:text-base max-w-[550px] mx-auto">
            Get your assignments done in three seamless steps without lifting a pen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, idx) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-[#071628] border border-[#0d2d50] hover:border-[#1a6fff]/30 rounded-2xl p-8 text-center relative group transition-all duration-300"
            >
              <div className={`absolute top-[-24px] left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-r ${step.color} text-white font-syne font-extrabold text-lg flex items-center justify-center shadow-md`}>
                {step.num}
              </div>
              
              <div className="text-4xl mb-5 mt-4 group-hover:scale-110 transition-transform duration-300">
                {step.emoji}
              </div>
              
              <h3 className="font-syne text-lg font-bold text-white mb-3">
                {step.title}
              </h3>
              
              <p className="text-[#7da3cc] text-xs md:text-sm leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
