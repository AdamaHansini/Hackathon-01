import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Search, ShieldCheck, HeartHandshake } from 'lucide-react';

export const Landing: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative px-6 py-24 md:py-32 lg:px-12 bg-surface overflow-hidden">
        <div className="mx-auto max-w-7xl relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Text Content */}
          <div className="text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-soft-nude/50 text-primary-button text-sm font-medium mb-6 backdrop-blur-sm border border-taupe-border/50">
              <span className="w-2 h-2 rounded-full bg-primary-button animate-pulse"></span>
              The Intelligent Recovery Network
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-dark-text sm:text-7xl mb-6 leading-tight">
              Recover what's <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-button to-warning">yours</span>,<br /> securely.
            </h1>
            <p className="mt-6 text-xl leading-8 text-muted-text max-w-xl">
              LostLink is a modern lost-and-found platform. Our Smart Match technology automatically connects lost items with found ones, keeping your private details safe until you're ready.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link to="/posts/create?type=LOST">
                <Button size="lg" variant="primary" className="shadow-lg shadow-primary-button/20 hover:shadow-xl hover:shadow-primary-button/30 transition-all">
                  I Lost Something
                </Button>
              </Link>
              <Link to="/posts/create?type=FOUND">
                <Button size="lg" variant="outline" className="bg-white/50 backdrop-blur-sm border-taupe-border hover:bg-soft-nude transition-all">
                  I Found Something
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-4 text-sm text-muted-text">
              <Link 
                to="/search" 
                className="font-medium text-primary-button hover:text-primary-hover flex items-center gap-1 group transition-colors"
              >
                <div className="p-2 bg-soft-nude rounded-full group-hover:bg-taupe-border transition-colors">
                  <Search className="h-4 w-4" />
                </div>
                Browse all active items
              </Link>
            </div>
          </div>

          {/* Hero Image / Illustration */}
          <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] flex items-center justify-center">
            {/* Glowing orbs behind image */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-soft-nude/40 rounded-full mix-blend-multiply filter blur-[80px] animate-blob"></div>
            <div className="absolute top-1/3 right-1/4 w-[60%] h-[60%] bg-light-beige/60 rounded-full mix-blend-multiply filter blur-[80px] animate-blob animation-delay-2000"></div>
            
            {/* Main Image */}
            <img 
              src="/assets/hero.png" 
              alt="Lost and found items connecting" 
              className="relative z-10 w-full h-full object-contain drop-shadow-2xl hover:scale-[1.02] transition-transform duration-700 ease-out"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 lg:px-8 bg-background">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 bg-surface border border-taupe-border rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Search className="h-8 w-8 text-primary-button" />
              </div>
              <h3 className="text-xl font-semibold text-dark-text mb-3">Smart Match Technology</h3>
              <p className="text-muted-text">
                Our AI analyzes item descriptions, locations, and timeframes to automatically suggest potential matches between lost and found reports.
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 bg-surface border border-taupe-border rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <ShieldCheck className="h-8 w-8 text-primary-button" />
              </div>
              <h3 className="text-xl font-semibold text-dark-text mb-3">Privacy by Default</h3>
              <p className="text-muted-text">
                Your contact details and exact location are never public. Private identifying details are used only for verification.
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 bg-surface border border-taupe-border rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <HeartHandshake className="h-8 w-8 text-primary-button" />
              </div>
              <h3 className="text-xl font-semibold text-dark-text mb-3">Secure Handover</h3>
              <p className="text-muted-text">
                Claims require verification. Only after the finder approves a claim does a private chat open to arrange a safe return.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
