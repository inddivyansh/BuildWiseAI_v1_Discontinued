import React, { useRef } from 'react'
import {
  UploadCloud,
  Layers,
  GitBranch,
  ShieldCheck,
  Eye,
  MessageSquare,
  FileCheck2,
  ArrowRight,
  Sparkles,
  MousePointerClick,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { InteractiveDemoStudio } from '../components/demo/InteractiveDemoStudio'

interface HowItWorksPageProps {
  onNavigate: (route: string) => void
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onNavigate }) => {
  const demoSectionRef = useRef<HTMLDivElement>(null)

  const scrollToDemo = () => {
    demoSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const steps = [
    {
      num: '01',
      title: 'Upload Your Blueprint',
      desc: 'DXF, vector PDF, or raster scans are ingested and parsed without geometric distortion.',
      icon: UploadCloud,
      color: 'text-indigo-400',
    },
    {
      num: '02',
      title: 'Extract Canonical Geometry',
      desc: 'Automatic detection of walls, rooms, doors, stairs, windows, and exit portals into a unified spatial schema.',
      icon: Layers,
      color: 'text-cyan-400',
    },
    {
      num: '03',
      title: 'Build Building Graph',
      desc: 'NetworkX topological circulation models calculate connectivity, travel distances, and egress bottlenecks.',
      icon: GitBranch,
      color: 'text-emerald-400',
    },
    {
      num: '04',
      title: 'NBC 2016 Compliance Analysis',
      desc: '100+ statutory clauses from NBC 2016 Part 3 & 4 evaluated deterministically against extracted dimensions.',
      icon: ShieldCheck,
      color: 'text-purple-400',
    },
    {
      num: '05',
      title: 'Visualize & Inspect Findings',
      desc: 'Interactive CAD overlay highlights non-compliances with calculated dimension shortfalls and visual fixes.',
      icon: Eye,
      color: 'text-rose-400',
    },
    {
      num: '06',
      title: 'Grounded Regulatory Citations',
      desc: 'Exact volume, part, clause, and page citations grounded directly in official Bureau of Indian Standards NBC PDFs.',
      icon: MessageSquare,
      color: 'text-amber-400',
    },
    {
      num: '07',
      title: 'Generate Statutory Report',
      desc: 'Export client-ready documentation and municipal compliance audit packages in one click.',
      icon: FileCheck2,
      color: 'text-blue-400',
    },
  ]

  return (
    <div className="min-h-screen bg-[#000000] text-[#F8FAFC] flex flex-col font-sans selection:bg-[#6B57FF] selection:text-white">
      {/* Header with Ambient Glow */}
      <section className="relative pt-14 pb-8 px-4 sm:px-6 text-center max-w-4xl mx-auto">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[280px] bg-[#6B57FF]/15 blur-[120px] pointer-events-none rounded-full" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141A29] border border-[#232D45] text-xs font-mono text-[#00F0FF] mb-3">
          <Sparkles className="w-3 h-3 text-[#00F0FF]" />
          <span>ALGORITHMIC ARCHITECTURE PIPELINE</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          How BuildWise Works
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
          From raw blueprint vector ingestion to deterministic NBC 2016 verification. Explore the interactive sample below or test with your own drawings.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={scrollToDemo}
            className="px-6 py-2.5 rounded-full bg-white hover:bg-slate-100 text-black font-bold text-xs shadow-lg flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <MousePointerClick className="w-3.5 h-3.5 text-indigo-600" />
            <span>Jump to Interactive Demo</span>
          </button>

          <button
            onClick={() => onNavigate('/projects/new')}
            className="px-6 py-2.5 rounded-full bg-[#121624] hover:bg-[#1A2033] text-slate-200 border border-[#232B3E] font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>Analyze Your Blueprint →</span>
          </button>
        </div>
      </section>

      {/* CENTERPIECE: REAL INTERACTIVE DEMO BLUEPRINT */}
      <section ref={demoSectionRef} className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
        <div className="mb-4 text-left flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="text-xs font-mono text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE INTERACTIVE DEMONSTRATION</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight mt-1">
              Sample Blueprint: Apex Studio Suites (Level 01)
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Click the highlighted corridor or door on the blueprint canvas to see how BuildWise detects statutory dimension shortfalls, cites verified NBC 2016 clauses, and provides actionable architectural corrections.
            </p>
          </div>

          <button
            onClick={() => onNavigate('/how-it-works/demo')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors self-start sm:self-auto"
          >
            <span>Open in Fullscreen Studio Mode</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* The Live Interactive Studio Component */}
        <InteractiveDemoStudio onNavigate={onNavigate} isEmbedded={true} />
      </section>

      {/* 7-Step Verified Pipeline Breakdown */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
            Behind the Scenes
          </span>
          <h2 className="text-3xl font-black text-white tracking-tight mt-1">
            Deterministic Evaluation Pipeline
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            The AI does not hallucinate PASS or FAIL. All compliance determinations are strictly computed from vector geometry against statutory thresholds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <div
                key={step.num}
                className="p-5 rounded-2xl bg-[#090C14] border border-[#1A2133] hover:border-[#6B57FF] transition-all group flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#141A29] border border-[#232D45] text-white flex items-center justify-center font-mono font-bold text-xs group-hover:scale-105 transition-transform">
                      {step.num}
                    </div>
                    <Icon className={`w-5 h-5 ${step.color}`} />
                  </div>
                  <h3 className="text-sm font-bold text-white leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#141B2B] text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Verified Deterministic Step</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Bottom Conversion CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="p-8 rounded-3xl bg-gradient-to-b from-[#0F1424] to-[#080B14] border border-[#1F293D] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] pointer-events-none rounded-full" />
          
          <h3 className="text-2xl font-black text-white tracking-tight">
            Ready to audit your own blueprint?
          </h3>
          <p className="text-xs text-slate-300 max-w-xl mx-auto mt-2 leading-relaxed">
            Upload your DXF, DWG, or PDF drawings to detect non-compliances, verify egress routes, and generate official NBC audit packages.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('/projects/new')}
              className="px-8 py-3 rounded-full bg-white hover:bg-slate-100 text-black font-bold text-xs shadow-lg flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <span>Upload Your Blueprint</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
