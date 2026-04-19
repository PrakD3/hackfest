"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { 
  ChevronRight, 
  Dna, 
  Beaker, 
  Activity, 
  Layers, 
  ShieldCheck, 
  Map, 
  FileText,
  Workflow,
  Sparkles,
  Search,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

const RESEARCH_PANELS = [
  {
    label: "Data Ingestion",
    title: "Omnichannel Intelligence",
    text: "Automatically ingest real-time scientific data from PubMed, UniProt, RCSB PDB, PubChem, and ClinicalTrials.gov.",
    icon: Search,
    color: "var(--primary)"
  },
  {
    label: "Design",
    title: "RDKit De Novo Generation",
    text: "Explore vast chemical spaces beyond existing databases using 3D diffusion and bioisostere strategies.",
    icon: Beaker,
    color: "#10b981"
  },
  {
    label: "Validation",
    title: "Multi-Agent Docking",
    text: "Simultaneous target vs off-target docking ensures high selectivity and reduced toxicity risks.",
    icon: ShieldCheck,
    color: "#3b82f6"
  },
  {
    label: "Synthesis",
    title: "Synthesis & Routing",
    text: "Predict synthesizability and generate full chemical routes with reagents, costs, and feasibility scores.",
    icon: Workflow,
    color: "#8b5cf6"
  },
];

const METRICS = [
  { value: "22", label: "Specialized Agents", sub: "Stage-gate workflow" },
  { value: "6", label: "Global Data Sources", sub: "Live scientific APIs" },
  { value: "100+", label: "Molecules per Run", sub: "Deep docking search" },
  { value: "<120s", label: "Typical Lead Time", sub: "End-to-end pipeline" },
];

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const horizontalOuterRef = useRef<HTMLDivElement>(null);
  const horizontalTrackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Hero Animations
      const tl = gsap.timeline();
      tl.from(".hero-badge", { opacity: 0, y: -20, duration: 0.6, ease: "power3.out" })
        .from(".hero-title span", { 
          opacity: 0, 
          y: 40, 
          duration: 0.8, 
          stagger: 0.1, 
          ease: "back.out(1.7)" 
        }, "-=0.4")
        .from(".hero-description", { opacity: 0, y: 20, duration: 0.6 }, "-=0.4")
        .from(".hero-ctas", { opacity: 0, y: 20, duration: 0.6 }, "-=0.4")
        .from(".hero-visual", { opacity: 0, scale: 0.9, duration: 1, ease: "power2.out" }, "-=0.6");

      // Grid reveal
      gsap.from(".grid-item", {
        opacity: 0,
        y: 40,
        duration: 0.8,
        stagger: 0.1,
        scrollTrigger: {
          trigger: ".bento-grid",
          start: "top 80%",
        }
      });

      // Horizontal Scroll
      const outer = horizontalOuterRef.current;
      const track = horizontalTrackRef.current;
      if (outer && track) {
        const totalScroll = track.scrollWidth - outer.clientWidth;
        gsap.to(track, {
          x: -totalScroll,
          ease: "none",
          scrollTrigger: {
            trigger: outer,
            start: "top top",
            end: () => `+=${totalScroll}`,
            scrub: 1,
            pin: true,
            invalidateOnRefresh: true,
          },
        });
      }

      // Feature reveal
      gsap.utils.toArray<HTMLElement>(".reveal-up").forEach((elem) => {
        gsap.from(elem, {
          y: 50,
          opacity: 0,
          duration: 1,
          scrollTrigger: {
            trigger: elem,
            start: "top 90%",
            toggleActions: "play none none reverse"
          }
        });
      });
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="bg-black text-white selection:bg-primary/30 min-h-screen font-sans overflow-x-hidden">
      {/* Floating Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 backdrop-blur-md bg-black/20 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
            <Dna className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold tracking-tight text-xl bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            ProtEngine <span className="text-primary/80 font-normal">Labs</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <Link href="/research" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Research</Link>
          <Link href="/discoveries" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Discoveries</Link>
          <Link href="/about-us" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">About Us</Link>
        </div>
        <Link 
          href="/research" 
          className="px-5 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors"
        >
          Get Started
        </Link>
      </nav>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 z-10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="hero-badge inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-mono tracking-widest uppercase text-primary">v4.0 Protocol Active</span>
          </div>

          <h1 className="hero-title text-6xl md:text-8xl font-bold tracking-tight mb-8">
            <span className="block italic text-zinc-400 font-serif">Accelerating</span>
            <span className="block bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
              Drug Discovery
            </span>
          </h1>

          <p className="hero-description text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            A high-precision multi-agent AI pipeline for translational research. 
            From protein mutation parsing to synthesizable lead compounds in under 120 seconds.
          </p>

          <div className="hero-ctas flex flex-wrap justify-center gap-4">
            <Link 
              href="/research" 
              className="group relative px-8 py-4 bg-white text-black rounded-full font-semibold transition-transform hover:scale-105"
            >
              Start Analysis
              <ArrowRight className="inline-block ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link 
              href="/discoveries" 
              className="px-8 py-4 bg-zinc-900 border border-white/10 rounded-full font-semibold hover:bg-zinc-800 transition-colors"
            >
              View Cases
            </Link>
          </div>
        </div>

        {/* Hero Visual Block */}
        <div className="hero-visual max-w-5xl mx-auto mt-20 p-4 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-sm relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-blue-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
           <div className="aspect-[16/9] w-full bg-zinc-950 rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center">
              {/* Abstract Pipeline Visual */}
              <div className="relative w-full h-full p-12 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="h-1 w-32 bg-primary/20 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[70%]" />
                    </div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase">Input: EGFR T790M</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono text-primary uppercase">Agent Consensus: 98.4%</p>
                    <p className="text-2xl font-bold font-mono">01:14.32</p>
                  </div>
                </div>

                <div className="flex justify-center gap-4 py-12">
                   {[1,2,3,4,5,6].map(i => (
                     <div key={i} className={`w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center bg-white/5 animate-pulse`} style={{ animationDelay: `${i * 0.2}s` }}>
                        <div className="w-2 h-2 rounded-full bg-zinc-700" />
                     </div>
                   ))}
                </div>

                <div className="flex justify-between items-end border-t border-white/5 pt-8">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-[10px] font-mono text-zinc-500 uppercase">Molecules</p>
                      <p className="text-xl font-bold">142</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-zinc-500 uppercase">Binding ΔG</p>
                      <p className="text-xl font-bold text-emerald-400">-9.4</p>
                    </div>
                  </div>
                  <div className="flex -space-x-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-zinc-950 bg-zinc-900" />
                    ))}
                  </div>
                </div>
              </div>
           </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="py-20 px-6 border-y border-white/5 bg-zinc-950/50 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {METRICS.map((m, i) => (
              <div key={i} className="reveal-up text-center md:text-left">
                <p className="text-4xl md:text-5xl font-bold mb-2 tracking-tighter text-white">
                  {m.value}
                </p>
                <p className="text-sm font-semibold text-zinc-100 mb-1">{m.label}</p>
                <p className="text-xs text-zinc-500 font-mono uppercase">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Bento Grid */}
      <section className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 reveal-up">Enterprise-Grade Pipeline</h2>
            <p className="text-zinc-400 max-w-xl mx-auto reveal-up">
              Every agent in our 22-step process is fine-tuned for chemical accuracy and structural integrity.
            </p>
          </div>

          <div className="bento-grid grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">
            <BentoItem 
              span="md:col-span-6 lg:col-span-8"
              title="3D Deep Docking"
              desc="Vina pose search + Gnina CNN scoring provides high-fidelity binding predictions across whole-protein surfaces."
              icon={Layers}
              image="https://images.unsplash.com/photo-1532187875605-2fe35f74de52?auto=format&fit=crop&q=80&w=800"
            />
            <BentoItem 
              span="md:col-span-6 lg:col-span-4"
              title="Live Sourcing"
              desc="No stale data. We pull the latest mutations and trial results directly from global repositories."
              icon={Sparkles}
              variant="amber"
            />
            <BentoItem 
              span="md:col-span-3 lg:col-span-4"
              title="ADMET-X"
              desc="DeepChem filters excluding PAINS and hERG blockers."
              icon={ShieldCheck}
            />
            <BentoItem 
              span="md:col-span-3 lg:col-span-4"
              title="Stability Scoring"
              desc="OpenMM GROMACS simulations for MM-GBSA validation."
              icon={Activity}
            />
            <BentoItem 
              span="md:col-span-6 lg:col-span-4" 
              title="Explainability"
              desc="Traceable rationale for every molecule selected."
              icon={FileText}
            />
          </div>
        </div>
      </section>

      {/* Horizontal Scroll Showcase */}
      <section ref={horizontalOuterRef} className="relative h-screen bg-black overflow-hidden border-t border-white/5">
        <div ref={horizontalTrackRef} className="flex h-full will-change-transform">
          {/* Intro Slide */}
          <div className="shrink-0 w-screen h-full flex flex-col justify-center px-12 md:px-32 bg-black border-r border-white/5">
              <span className="text-primary font-mono text-xs uppercase tracking-[0.3em] mb-4">Discovery Lifecycle</span>
              <h3 className="text-5xl md:text-8xl font-bold max-w-4xl tracking-tight leading-[0.9]">
                Engineered for <br/> <span className="text-zinc-600">Precision.</span>
              </h3>
          </div>

          {RESEARCH_PANELS.map((panel, i) => (
            <div key={i} className="shrink-0 w-screen h-full flex flex-col justify-center px-12 md:px-32 bg-zinc-950/20">
               <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <panel.icon className="w-6 h-6" style={{ color: panel.color }} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none">Stage {i+1}</span>
                    <h4 className="text-xl font-bold leading-none mt-1">{panel.label}</h4>
                  </div>
               </div>
               <h3 className="text-4xl md:text-6xl font-medium max-w-4xl tracking-tight mb-8 leading-[1.1]">
                  {panel.title}
               </h3>
               <p className="text-lg md:text-xl text-zinc-500 max-w-2xl leading-relaxed">
                  {panel.text}
               </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-40 px-6 relative z-10 text-center overflow-hidden">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[160px] opacity-20" />
         <div className="max-w-4xl mx-auto relative">
           <h2 className="text-5xl md:text-7xl font-bold mb-12 reveal-up">Ready to accelerate <br/> your next discovery?</h2>
           <div className="reveal-up flex flex-wrap justify-center gap-6">
              <Link href="/research" className="px-10 py-5 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-transform">
                Launch Workspace
              </Link>
              <Link href="/about-us" className="px-10 py-5 bg-zinc-900 border border-white/10 rounded-full font-bold text-lg">
                Technical Specs
              </Link>
           </div>
         </div>
         <div className="mt-32 pt-20 border-t border-white/5 text-zinc-600 text-[10px] font-mono uppercase tracking-[0.5em]">
            © 2026 AXONENGINE / PROTENGINE LABS · ALL RIGHTS COMPREHENDED
         </div>
      </section>
    </div>
  );
}

function BentoItem({ title, desc, icon: Icon, span, variant, image }: any) {
  return (
    <div className={`grid-item ${span} rounded-3xl border border-white/5 bg-zinc-900/20 backdrop-blur-md p-8 relative overflow-hidden group hover:bg-zinc-900/40 transition-colors`}>
      {image && (
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none grayscale group-hover:grayscale-0 transition-all duration-700">
           <img src={image} className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-1000" alt="" />
           <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        </div>
      )}
      <div className="relative z-10">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
           <Icon className={`w-5 h-5 ${variant === 'amber' ? 'text-primary' : 'text-zinc-400'}`} />
        </div>
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-sm text-zinc-500 leading-relaxed max-w-[280px]">{desc}</p>
      </div>
    </div>
  );
}
