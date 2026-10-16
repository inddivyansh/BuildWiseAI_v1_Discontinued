import React, { useState, useEffect } from 'react'
import {
  Layers,
  ArrowRight,
  Plus,
  FileDown,
  FileUp,
  ChevronRight,
  Menu,
  X,
  ScanLine,
} from 'lucide-react'

export interface NavbarProps {
  theme?: 'dark' | 'light'
  currentRoute?: string
  projectName?: string
  activeWorkspaceTab?: string
  onWorkspaceTabChange?: (tab: string) => void
  onNavigate: (route: string) => void
  onAnalyzeBlueprint?: () => void
  onExportReport?: () => void
  isWorkspace?: boolean
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute = '/',
  projectName,
  activeWorkspaceTab = 'floor-plan',
  onWorkspaceTabChange,
  onNavigate,
  onAnalyzeBlueprint,
  onExportReport,
  isWorkspace = false,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Automatically close mobile menu on route navigation
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [currentRoute])

  const workspaceTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'floor-plan', label: 'Floor Plan' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'violations', label: 'Violations' },
    { id: 'measurements', label: 'Measurements' },
    { id: 'egress', label: 'Egress' },
    { id: 'assistant', label: 'AI Assistant' },
    { id: 'report', label: 'Report' },
  ]

  const navLinks = [
    { label: 'Product', path: '/' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'Projects', path: '/projects' },
    { label: 'Blueprint Check', path: '/blueprint-assess' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-[#000000] border-b border-[#1A1D26] text-white select-none">
      {/* Primary Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center gap-3 group focus:outline-none cursor-pointer"
          >
            {/* JetBrains-style logo icon */}
            <div className="relative w-8 h-8 rounded-lg bg-black p-[1.5px] bg-gradient-to-br from-[#FE2857] via-[#9B51E0] to-[#6B57FF] flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 shrink-0">
              <div className="w-full h-full bg-[#090A0F] rounded-[6px] flex items-center justify-center">
                <span className="font-mono text-[13px] font-black text-white leading-none tracking-tighter">_BW</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-white group-hover:text-slate-200 transition-colors uppercase">
                BuildWise
              </span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#161B28] text-[#818CF8] border border-[#232B3E]">
                AI
              </span>
            </div>
          </button>

          {isWorkspace && projectName && (
            <div className="hidden sm:flex items-center gap-2 text-xs ml-2 pl-3 border-l border-slate-800">
              <button
                onClick={() => onNavigate('/projects')}
                className="text-slate-400 hover:text-white transition-colors"
              >
                Projects
              </button>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="font-semibold text-slate-200 truncate max-w-[160px] md:max-w-[200px]">
                {projectName}
              </span>
            </div>
          )}
        </div>

        {/* Desktop Center Links */}
        {!isWorkspace && (
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium tracking-wide">
            {navLinks.map((link) => {
              const isActive =
                link.path === '/'
                  ? currentRoute === '/'
                  : currentRoute.startsWith(link.path)
              return (
                <button
                  key={link.path}
                  onClick={() => onNavigate(link.path)}
                  className={`transition-colors py-1 relative cursor-pointer ${
                    isActive ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-[#6B57FF] rounded-full" />
                  )}
                </button>
              )
            })}
          </nav>
        )}

        {/* Right Actions Area */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop Analyze / Project Buttons (hidden on mobile to prevent crowding) */}
          {isWorkspace ? (
            <>
              {onExportReport && (
                <button
                  onClick={onExportReport}
                  className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#121624] hover:bg-[#1A2033] text-slate-200 border border-[#232B3E] transition-all"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Export Report</span>
                </button>
              )}

              <button
                onClick={onAnalyzeBlueprint || (() => onNavigate('/projects/new'))}
                className="hidden md:flex items-center gap-2 px-5 py-2 rounded-full bg-white hover:bg-slate-100 text-black text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Analyze Blueprint</span>
              </button>
            </>
          ) : currentRoute.startsWith('/projects') ? (
            <button
              onClick={() => onNavigate('/projects/new')}
              className="hidden md:flex items-center gap-2 px-5 py-2 rounded-full bg-white hover:bg-slate-100 text-black text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('/projects/new')}
              className="hidden md:flex items-center gap-2 px-5 py-2 rounded-full bg-white hover:bg-slate-100 text-black text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span>Analyze Blueprint</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Mobile Navigation Toggle (Hamburger button) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-[#0F1422] border border-[#222C42] text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#070A12] border-b border-[#1A2234] px-4 py-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-2 text-left">
            {navLinks.map((link) => {
              const isActive =
                link.path === '/'
                  ? currentRoute === '/'
                  : currentRoute.startsWith(link.path)
              return (
                <button
                  key={link.path}
                  onClick={() => {
                    onNavigate(link.path)
                    setIsMobileMenuOpen(false)
                  }}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors ${
                    isActive
                      ? 'bg-[#151D30] text-white border border-[#232F4D]'
                      : 'text-slate-300 hover:bg-[#0D1322] hover:text-white'
                  }`}
                >
                  <span>{link.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              )
            })}

            {/* Mobile Analyze Action */}
            <div className="pt-3 mt-2 border-t border-[#161F32]">
              <button
                onClick={() => {
                  onNavigate('/projects/new')
                  setIsMobileMenuOpen(false)
                }}
                className="w-full py-3 rounded-xl bg-white hover:bg-slate-100 text-black text-xs font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
              >
                <span>Analyze Blueprint</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JetBrains-Style Workspace Tab Bar (When inside Project Workspace) */}
      {isWorkspace && (
        <div className="border-t border-[#161B26] px-4 sm:px-6 overflow-x-auto bg-[#05070B]">
          <div className="max-w-7xl mx-auto flex items-center gap-1">
            {workspaceTabs.map((tab) => {
              const isActive = activeWorkspaceTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => onWorkspaceTabChange && onWorkspaceTabChange(tab.id)}
                  className={`py-2.5 px-3.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'border-[#6B57FF] text-white font-bold bg-[#0F131F]'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#0A0D15]'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </header>
  )
}
