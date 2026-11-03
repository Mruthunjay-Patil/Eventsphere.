import React from 'react';
import { Search, MessageSquare, ShieldCheck, HeartHandshake } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Discover & Compare',
      description: 'Search verified photographers, bridal makeup artists, decorators, caterers, and venues with authentic reviews.',
      icon: Search,
    },
    {
      number: '02',
      title: 'Request Free Quotes',
      description: 'Submit your date, guest count, and requirements to receive customized itemized bids within 24 hours.',
      icon: MessageSquare,
    },
    {
      number: '03',
      title: 'Escrow Milestone Protection',
      description: 'Lock in your booking with secure escrow payments. Funds are safely released only when each milestone is completed.',
      icon: ShieldCheck,
    },
    {
      number: '04',
      title: 'Celebrate Stress-Free',
      description: 'Relax and enjoy your dream celebration while our verified vendors deliver seamless, breathtaking experiences.',
      icon: HeartHandshake,
    },
  ];

  return (
    <section className="py-14 sm:py-20 bg-white text-stone-900 border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#E83A59]">
            SIMPLE 4-STEP PROCESS
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight mt-1">
            How Wedding Planning Works
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-2">
            Trusted by over 500,000+ couples across India to organize flawless weddings and celebrations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="bg-stone-50 rounded-2xl p-6 border border-stone-200/80 hover:border-rose-200 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-[#E83A59]">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-stone-300">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-stone-900 mb-2">
                    {step.title}
                  </h3>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
