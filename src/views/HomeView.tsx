import React from 'react';
import { HeroSection } from '../components/home/HeroSection';
import { EventTypesGrid } from '../components/home/EventTypesGrid';
import { FeaturedVendors } from '../components/home/FeaturedVendors';
import { HowItWorks } from '../components/home/HowItWorks';
import { AiBannerCTA } from '../components/home/AiBannerCTA';

export const HomeView: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-[#1f1f1f]">
      <HeroSection />
      <EventTypesGrid />
      <FeaturedVendors />
      <AiBannerCTA />
      <HowItWorks />
    </div>
  );
};
