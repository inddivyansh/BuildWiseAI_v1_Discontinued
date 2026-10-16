import React, { useState, useRef, useCallback } from 'react'
import {
  UploadCloud, X, AlertTriangle, AlertCircle, Info, CheckCircle2,
  Lightbulb, Sparkles, Loader2, ZoomIn, ZoomOut, ChevronDown, ChevronUp,
  ArrowLeft, ShieldAlert, Target, FileImage, Eye, Layers, RotateCcw,
  Download, Columns, ShieldCheck, ArrowRight, Compass,
  Sliders, FileText, Check, Copy
} from 'lucide-react'
import { apiClient } from '../api/client'

interface BlueprintAssessPageProps {
  onNavigate: (route: string) => void
}

type Severity = 'critical' | 'major' | 'minor' | 'suggestion'
type Category =
  | 'structural' | 'egress' | 'ventilation' | 'dimensions'
  | 'fire_safety' | 'accessibility' | 'planning' | 'services' | 'general'

interface Issue {
  id: string
  category: Category
  severity: Severity
  title: string
  description: string
  location?: string
  recommendation: string
  code_reference?: string
  coordinates?: { x_pct: number; y_pct: number }
}

interface Improvement {
  id: string
  priority: number
  title: string
  detail: string
  estimated_impact: string
  category: string
}

interface Annotation {
  issue_id: string
  shape: string
  x_pct: number
  y_pct: number
  color: string
  label: string
}

interface RevisedElement {
  id: string
  issue_id?: string
  title: string
  category: string
  element_type: 'corridor' | 'door' | 'ventilation' | 'fire_barrier' | 'ramp' | 'dimension' | 'annotation'
  x_pct: number
  y_pct: number
  width_pct?: number
  height_pct?: number
  color: string
  description: string
  code_reference?: string
}

interface AssessmentResult {
  assessment_id: string
  filename: string
  file_format: string
  image_width_px?: number
  image_height_px?: number
  processing_time_ms: number
  ai_model_used: string
  overall_risk: 'low' | 'medium' | 'high' | 'critical'
  compliance_score: number
  issues: Issue[]
  improvements: Improvement[]
  annotations: Annotation[]
  revised_elements: RevisedElement[]
  executive_summary: string
  revised_blueprint_notes: string
  base64_image?: string
  disclaimer: string
}

// ── Configuration Constants ──────────────────────────────────────────────────

const SEV_CFG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: '#EF4444', label: 'Critical' },
  major:    { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: '#F97316', label: 'Major' },
  minor:    { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: '#EAB308', label: 'Minor' },
  suggestion: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: '#3B82F6', label: 'Suggestion' },
} as const

const CAT_LABEL: Record<Category, string> = {
  structural: 'Structural', egress: 'Egress', ventilation: 'Ventilation',
  dimensions: 'Dimensions', fire_safety: 'Fire Safety', accessibility: 'Accessibility',
  planning: 'Planning', services: 'Services', general: 'General',
}

const RISK_CFG = {
  low:      { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Low Risk' },
  medium:   { color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  label: 'Medium Risk' },
  high:     { color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  label: 'High Risk' },
  critical: { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     label: 'Critical Risk' },
} as const

const OCCUPANCY_OPTIONS = [
  { value: 'Residential',     label: 'Residential (Group A)' },
  { value: 'Business/Office', label: 'Business / Office (Group B)' },
  { value: 'Educational',     label: 'Educational (Group C)' },
  { value: 'Institutional',   label: 'Institutional (Group D)' },
  { value: 'Assembly',        label: 'Assembly (Group E)' },
  { value: 'Other/Mixed',     label: 'Other / Mixed Occupancy' },
]

// ── Sample Blueprint Generator ────────────────────────────────────────────────

function generateSampleBlueprintSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="1000" height="700" style="background:#0c1322; font-family: monospace;">
    <!-- Blueprint Grid -->
    <defs>
      <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#172554" stroke-width="0.5"/>
      </pattern>
      <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
        <rect width="100" height="100" fill="url(#smallGrid)"/>
        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#1e3a8a" stroke-width="1.2"/>
      </pattern>
    </defs>
    <rect width="1000" height="700" fill="url(#grid)"/>

    <!-- Outer Walls -->
    <rect x="80" y="80" width="840" height="540" fill="none" stroke="#38bdf8" stroke-width="5"/>
    <rect x="86" y="86" width="828" height="528" fill="none" stroke="#0284c7" stroke-width="1.5"/>

    <!-- Interior Room Partitions -->
    <!-- Room A (West Chamber) -->
    <rect x="80" y="80" width="300" height="240" fill="#0f172a" fill-opacity="0.4" stroke="#38bdf8" stroke-width="3"/>
    <text x="140" y="200" fill="#93c5fd" font-size="14" font-weight="bold">CONF ROOM A</text>
    <text x="140" y="220" fill="#60a5fa" font-size="11">AREA: 28.5 m²</text>

    <!-- Room B (Office Wing North) -->
    <rect x="380" y="80" width="320" height="240" fill="#0f172a" fill-opacity="0.4" stroke="#38bdf8" stroke-width="3"/>
    <text x="460" y="200" fill="#93c5fd" font-size="14" font-weight="bold">OFFICE SUITE B</text>
    <text x="460" y="220" fill="#60a5fa" font-size="11">AREA: 34.2 m²</text>

    <!-- Room C (East Core) -->
    <rect x="700" y="80" width="220" height="240" fill="#0f172a" fill-opacity="0.4" stroke="#38bdf8" stroke-width="3"/>
    <text x="740" y="200" fill="#93c5fd" font-size="14" font-weight="bold">SERVER / MECH</text>
    <text x="740" y="220" fill="#60a5fa" font-size="11">AREA: 18.0 m²</text>

    <!-- Central Corridor -->
    <rect x="80" y="320" width="840" height="90" fill="#1e293b" fill-opacity="0.25" stroke="#38bdf8" stroke-width="2" stroke-dasharray="6,4"/>
    <text x="430" y="370" fill="#38bdf8" font-size="15" font-weight="bold" letter-spacing="4">MAIN CORRIDOR (CLEAR: 1.1m)</text>

    <!-- South Wing (Open Workstations) -->
    <rect x="80" y="410" width="460" height="210" fill="#0f172a" fill-opacity="0.4" stroke="#38bdf8" stroke-width="3"/>
    <text x="210" y="520" fill="#93c5fd" font-size="14" font-weight="bold">WORKSTATION FLOOR</text>
    <text x="210" y="540" fill="#60a5fa" font-size="11">CAPACITY: 48 PERSONS</text>

    <!-- South-East Reception & Entrance -->
    <rect x="540" y="410" width="380" height="210" fill="#0f172a" fill-opacity="0.4" stroke="#38bdf8" stroke-width="3"/>
    <text x="660" y="520" fill="#93c5fd" font-size="14" font-weight="bold">RECEPTION / LOBBY</text>
    <text x="660" y="540" fill="#60a5fa" font-size="11">MAIN ACCESS PORTAL</text>

    <!-- Doors -->
    <path d="M 200 320 A 40 40 0 0 0 240 280" fill="none" stroke="#22d3ee" stroke-width="2"/>
    <line x1="200" y1="320" x2="200" y2="280" stroke="#22d3ee" stroke-width="2.5"/>
    <path d="M 500 320 A 40 40 0 0 0 540 280" fill="none" stroke="#22d3ee" stroke-width="2"/>
    <line x1="500" y1="320" x2="500" y2="280" stroke="#22d3ee" stroke-width="2.5"/>
    <path d="M 720 410 A 50 50 0 0 0 770 460" fill="none" stroke="#22d3ee" stroke-width="2"/>
    <line x1="720" y1="410" x2="770" y2="410" stroke="#22d3ee" stroke-width="2.5"/>

    <!-- Main Entry Steps -->
    <rect x="180" y="620" width="160" height="15" fill="#334155" stroke="#38bdf8" stroke-width="1.5"/>
    <rect x="190" y="635" width="140" height="15" fill="#334155" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="210" y="646" fill="#94a3b8" font-size="10">ENTRY STEPS (NO RAMP)</text>

    <!-- North Exit (Narrow Bottleneck) -->
    <rect x="760" y="70" width="50" height="15" fill="#f43f5e" fill-opacity="0.3" stroke="#f43f5e" stroke-width="1.5"/>
    <text x="740" y="62" fill="#f43f5e" font-size="10">EXIT (W=0.85m)</text>

    <!-- Title Block -->
    <rect x="680" y="570" width="230" height="42" fill="#0284c7" fill-opacity="0.1" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="690" y="588" fill="#e0f2fe" font-size="11" font-weight="bold">COMMERCIAL FLOOR PLAN LVL-1</text>
    <text x="690" y="602" fill="#7dd3fc" font-size="9">SCALE 1:100 | PROJECT BW-2026-X</text>
  </svg>`
}

const SevIcon: React.FC<{ sev: Severity; className?: string }> = ({ sev, className = 'w-4 h-4' }) => {
  if (sev === 'critical') return <AlertCircle className={className} />
  if (sev === 'major')    return <AlertTriangle className={className} />
  if (sev === 'minor')    return <Info className={className} />
  return <Lightbulb className={className} />
}

export const BlueprintAssessPage: React.FC<BlueprintAssessPageProps> = ({ onNavigate }) => {
  // Upload & File State
  const [dragActive, setDragActive]       = useState(false)
  const [selectedFile, setSelectedFile]   = useState<File | null>(null)
  const [previewUrl, setPreviewUrl]       = useState<string | null>(null)
  const [occupancy, setOccupancy]         = useState('Business/Office')

  // Analysis State
  const [isAnalyzing, setIsAnalyzing]       = useState(false)
  const [analysisPhase, setAnalysisPhase]   = useState('')
  const [analysisPct, setAnalysisPct]       = useState(0)
  const [result, setResult]                 = useState<AssessmentResult | null>(null)
  const [error, setError]                   = useState<string | null>(null)

  // Viewer State
  const [viewMode, setViewMode]                 = useState<'flaws' | 'revised' | 'split'>('revised')
  const [selectedIssueId, setSelectedIssueId]   = useState<string | null>(null)
  const [selectedRevId, setSelectedRevId]       = useState<string | null>(null)
  const [zoom, setZoom]                         = useState(1)
  const [showAnnotations, setShowAnnotations]   = useState(true)
  const [sevFilter, setSevFilter]               = useState<Severity | 'all'>('all')
  const [expandedImp, setExpandedImp]           = useState<string | null>(null)
  const [copiedNotes, setCopiedNotes]           = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Handle File ────────────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.pdf', '.bmp', '.webp', '.tiff', '.tif', '.svg']
    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase()
    if (!allowed.includes(ext)) {
      setError(`Unsupported format "${ext}". Allowed: PNG, JPG, JPEG, PDF, BMP, WEBP, TIFF, SVG`)
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('File exceeds 20 MB limit.')
      return
    }
    setError(null)
    setResult(null)
    setSelectedFile(file)
    if (file.type.startsWith('image/') || ext === '.svg') {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  // ── Load Sample Blueprint ──────────────────────────────────────────────────
  const handleLoadSample = useCallback(() => {
    const svgStr = generateSampleBlueprintSvg()
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const sampleFile = new File([blob], 'sample_commercial_floorplan.svg', { type: 'image/svg+xml' })
    handleFile(sampleFile)
  }, [handleFile])

  // ── Execute Blueprint Assessment ───────────────────────────────────────────
  const runAnalysis = async () => {
    if (!selectedFile) return
    setIsAnalyzing(true)
    setError(null)
    setResult(null)
    setAnalysisPct(0)

    const phases = [
      { label: 'Ingesting blueprint image & geometry…', pct: 15 },
      { label: 'Scanning structural elements & egress corridors…', pct: 35 },
      { label: 'Validating against NBC 2016 safety & dimension codes…', pct: 60 },
      { label: 'Detecting flaws & marking defect coordinates…', pct: 80 },
      { label: 'Synthesizing suggested revised blueprint drawing…', pct: 95 },
      { label: 'Building compliance dashboard…', pct: 99 },
    ]
    let pi = 0
    const timer = setInterval(() => {
      if (pi < phases.length) {
        setAnalysisPhase(phases[pi].label)
        setAnalysisPct(phases[pi].pct)
        pi++
      }
    }, 1200)

    try {
      const data = await apiClient.assessBlueprint(selectedFile, occupancy, true)
      clearInterval(timer)
      setAnalysisPct(100)
      setAnalysisPhase('Assessment complete!')
      await new Promise(r => setTimeout(r, 400))
      setResult(data)
      setViewMode('revised') // Default to showing the improved blueprint drawing
    } catch (err: any) {
      clearInterval(timer)
      setError(err?.response?.data?.detail || err?.message || 'Analysis failed. Is the backend service active?')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ── Export / Download ──────────────────────────────────────────────────────
  const handleDownloadReport = () => {
    if (!result) return
    const reportData = {
      title: 'BuildWise AI - Blueprint Assessment & Revised Drawing Report',
      assessment_id: result.assessment_id,
      filename: result.filename,
      date: new Date().toISOString(),
      compliance_score: result.compliance_score,
      overall_risk: result.overall_risk,
      ai_model: result.ai_model_used,
      executive_summary: result.executive_summary,
      revised_blueprint_notes: result.revised_blueprint_notes,
      total_flaws: result.issues.length,
      issues: result.issues,
      improvement_suggestions: result.improvements,
      revised_drawing_elements: result.revised_elements,
    }
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Blueprint_Assessment_${result.filename.replace(/\.[^/.]+$/, '')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyNotes = () => {
    if (!result) return
    navigator.clipboard.writeText(result.revised_blueprint_notes)
    setCopiedNotes(true)
    setTimeout(() => setCopiedNotes(false), 2000)
  }

  // ── Filtered Issues ────────────────────────────────────────────────────────
  const filteredIssues = result?.issues.filter(i => sevFilter === 'all' || i.severity === sevFilter) ?? []
  const countBySev = (s: Severity) => result?.issues.filter(i => i.severity === s).length ?? 0
  const scoreColor = !result ? 'text-white'
    : result.compliance_score >= 80 ? 'text-emerald-400'
    : result.compliance_score >= 60 ? 'text-yellow-400' : 'text-red-400'
  const riskCfg = result ? RISK_CFG[result.overall_risk] : RISK_CFG.medium

  // Active highlighted issue / revision
  const activeIssue = result?.issues.find(i => i.id === selectedIssueId)
  const activeRev = result?.revised_elements?.find(r => r.id === selectedRevId)

  // ── Render Blueprint SVG Canvas Overlays ───────────────────────────────────
  const renderFlawOverlay = () => {
    if (!result || !showAnnotations) return null
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {result.annotations.map(ann => {
          const isSelected = ann.issue_id === selectedIssueId
          return (
            <g
              key={ann.issue_id}
              className="pointer-events-auto cursor-pointer transition-transform hover:scale-110"
              onClick={() => {
                setSelectedIssueId(isSelected ? null : ann.issue_id)
                setSelectedRevId(null)
              }}
            >
              {/* Outer pulsing ring if selected */}
              {isSelected && (
                <circle cx={ann.x_pct} cy={ann.y_pct} r={5.5} fill="none" stroke={ann.color} strokeWidth="0.8" opacity={0.6} className="animate-ping" />
              )}
              <circle cx={ann.x_pct} cy={ann.y_pct} r={isSelected ? 4.2 : 3.2} fill="none" stroke={ann.color} strokeWidth="0.8" opacity={0.4} />
              <circle cx={ann.x_pct} cy={ann.y_pct} r={isSelected ? 2.8 : 2.0} fill={ann.color} stroke="#FFFFFF" strokeWidth="0.5" />
              {/* Smart clamped badge placement */}
              {(() => {
                const isNearRight = ann.x_pct > 78
                const badgeX = isNearRight ? ann.x_pct - 16.0 : ann.x_pct + 2.8
                const badgeY = Math.max(1.5, Math.min(94.0, ann.y_pct - 2.5))
                return (
                  <>
                    <rect x={badgeX} y={badgeY} width={13.5} height={4.2} rx={1} fill="#090D16" fillOpacity={0.92} stroke={ann.color} strokeWidth="0.4" />
                    <text x={badgeX + 1.2} y={badgeY + 2.8} fontSize="2.4" fill="#FFFFFF" fontWeight="bold" fontFamily="monospace">
                      {ann.label}
                    </text>
                  </>
                )
              })()}
            </g>
          )
        })}
      </svg>
    )
  }

  const renderRevisedBlueprintOverlay = () => {
    if (!result || !showAnnotations || !result.revised_elements) return null
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {result.revised_elements.map(rev => {
          const isSelected = rev.id === selectedRevId
          const w = rev.width_pct || 14
          const h = rev.height_pct || 7
          const x = rev.x_pct - w / 2
          const y = rev.y_pct - h / 2

          return (
            <g
              key={rev.id}
              className="pointer-events-auto cursor-pointer"
              onClick={() => {
                setSelectedRevId(isSelected ? null : rev.id)
                if (rev.issue_id) setSelectedIssueId(rev.issue_id)
              }}
            >
              {/* Architectural Modification Shapes */}
              {rev.element_type === 'corridor' && (
                <g>
                  {/* Expanded Corridor safety clearance area */}
                  <rect x={x} y={y} width={w} height={h} rx={1.5} fill={rev.color} fillOpacity={isSelected ? 0.35 : 0.22} stroke={rev.color} strokeWidth="0.8" strokeDasharray="2,1" />
                  {/* Flow Arrow */}
                  <line x1={x + 2} y1={rev.y_pct} x2={x + w - 2} y2={rev.y_pct} stroke="#FFFFFF" strokeWidth="0.6" strokeDasharray="1.5,1" />
                  <polygon points={`${x + w - 1},${rev.y_pct} ${x + w - 3.5},${rev.y_pct - 1.2} ${x + w - 3.5},${rev.y_pct + 1.2}`} fill="#FFFFFF" />
                </g>
              )}

              {rev.element_type === 'door' && (
                <g>
                  {/* New Exit Door Swing Arc */}
                  <rect x={x} y={y} width={w} height={h} rx={1} fill={rev.color} fillOpacity={0.25} stroke={rev.color} strokeWidth="0.8" />
                  <path d={`M ${x + 2} ${y + h} A ${h * 0.8} ${h * 0.8} 0 0 1 ${x + w - 2} ${y + 2}`} fill="none" stroke="#38BDF8" strokeWidth="0.6" strokeDasharray="1.5,1" />
                  <circle cx={rev.x_pct} cy={rev.y_pct} r={1.5} fill="#FFFFFF" />
                </g>
              )}

              {rev.element_type === 'fire_barrier' && (
                <g>
                  {/* 2-Hour Rated Fire Partition Wall */}
                  <rect x={x} y={y} width={w} height={h} fill="#F43F5E" fillOpacity={0.3} stroke="#F43F5E" strokeWidth="1.2" />
                  <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke="#FFFFFF" strokeWidth="0.8" strokeDasharray="3,2" />
                </g>
              )}

              {rev.element_type === 'ventilation' && (
                <g>
                  {/* Natural Glazing Louver / Ventilation Shaft */}
                  <rect x={x} y={y} width={w} height={h} rx={1} fill="#0284C7" fillOpacity={0.25} stroke="#38BDF8" strokeWidth="0.8" />
                  <line x1={x + 2} y1={y + 2} x2={x + w - 2} y2={y + h - 2} stroke="#38BDF8" strokeWidth="0.5" />
                  <line x1={x + 2} y1={y + h - 2} x2={x + w - 2} y2={y + 2} stroke="#38BDF8" strokeWidth="0.5" />
                </g>
              )}

              {rev.element_type === 'ramp' && (
                <g>
                  {/* Universal Accessibility Ramp */}
                  <rect x={x} y={y} width={w} height={h} rx={1.5} fill="#9333EA" fillOpacity={0.25} stroke="#C084FC" strokeWidth="0.8" />
                  {/* Chevron Slope indicators */}
                  <polyline points={`${x + 3},${y + 2} ${x + 5},${rev.y_pct} ${x + 3},${y + h - 2}`} fill="none" stroke="#FFFFFF" strokeWidth="0.6" />
                  <polyline points={`${x + 7},${y + 2} ${x + 9},${rev.y_pct} ${x + 7},${y + h - 2}`} fill="none" stroke="#FFFFFF" strokeWidth="0.6" />
                </g>
              )}

              {rev.element_type === 'dimension' && (
                <g>
                  {/* Dimension Annotation Line */}
                  <rect x={x} y={y} width={w} height={h} rx={1} fill="#10B981" fillOpacity={0.15} stroke="#10B981" strokeWidth="0.6" strokeDasharray="1.5,1.5" />
                </g>
              )}

              {/* Smart Tag / Label Stamp */}
              {(() => {
                const stampW = Math.max(w, 20)
                const stampX = Math.max(1, Math.min(99 - stampW, x))
                const stampY = y > 6 ? y - 4 : Math.min(95, y + h + 0.8)
                return (
                  <g transform={`translate(${stampX}, ${stampY})`}>
                    <rect x={0} y={0} width={stampW} height={3.8} rx={1} fill="#090D16" fillOpacity={0.95} stroke={rev.color} strokeWidth="0.5" />
                    <circle cx={2} cy={1.9} r={1} fill={rev.color} />
                    <text x={4} y={2.6} fontSize="2.1" fill="#FFFFFF" fontWeight="bold" fontFamily="monospace">
                      {rev.id}: {rev.element_type.toUpperCase()}
                    </text>
                  </g>
                )
              })()}
            </g>
          )
        })}
      </svg>
    )
  }

  return (
    <div className="min-h-screen bg-[#070A12] text-white font-sans selection:bg-violet-500/30">

      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 border-b border-white/5 bg-[#070A12]/95 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">BuildWise AI</span>
              <span className="text-xs text-violet-400 ml-1.5 font-mono hidden sm:inline">Blueprint Vision Studio</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {result && (
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Report</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Hero Section — shown when no results */}
        {!result && !isAnalyzing && (
          <div className="text-center py-6 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-mono mb-4 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Vision AI Construction Blueprint Evaluation
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Automated Blueprint Flaw Assessment &amp; Revised Drawing
            </h1>
            <p className="mt-4 text-slate-400 text-base leading-relaxed">
              Upload any construction floor plan or blueprint (PNG, JPG, PDF, SVG). BuildWise AI evaluates
              structural flaws, fire egress, ventilation, and dimensional compliance against <strong>NBC 2016</strong>,
              and generates a <strong>Suggested Revised Blueprint Drawing</strong> with visual architectural improvements.
            </p>
          </div>
        )}

        {/* Upload & Dropzone Area */}
        {!result && !isAnalyzing && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div
              onDragEnter={e => { e.preventDefault(); setDragActive(true) }}
              onDragOver={e => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={e => { e.preventDefault(); setDragActive(false) }}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={[
                'relative rounded-3xl border-2 border-dashed cursor-pointer overflow-hidden transition-all duration-300',
                dragActive ? 'border-violet-400 bg-violet-500/10 shadow-[0_0_50px_rgba(139,92,246,0.25)] scale-[1.01]'
                  : selectedFile ? 'border-cyan-500/50 bg-cyan-500/5'
                  : 'border-slate-700/80 hover:border-slate-500 bg-slate-900/40 hover:bg-slate-900/70',
              ].join(' ')}
            >
              <div className="relative px-8 py-10 flex flex-col items-center gap-4 text-center">
                {selectedFile ? (
                  <>
                    {previewUrl && (
                      <div className="w-56 h-36 rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-[#0B0F17]">
                        <img src={previewUrl} alt="blueprint preview" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 max-w-sm">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                        <FileImage className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{selectedFile.name}</p>
                        <p className="text-xs text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null) }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">Click or drop another file to replace</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-600/20 via-indigo-600/20 to-cyan-600/20 border border-slate-700 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-8 h-8 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">Drag &amp; drop construction blueprint</p>
                      <p className="text-sm text-slate-400 mt-1">or click to browse local files</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {['PNG', 'JPG', 'JPEG', 'PDF', 'SVG', 'BMP', 'WEBP', 'TIFF'].map(fmt => (
                        <span key={fmt} className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300">
                          {fmt}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">Max size 20 MB · Vision AI enabled</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.svg,.bmp,.webp,.tiff,.tif"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
                className="hidden"
              />
            </div>

            {/* Quick Sample Button */}
            {!selectedFile && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-slate-300">Don't have a blueprint file handy?</span>
                </div>
                <button
                  onClick={handleLoadSample}
                  type="button"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Load Sample Floor Plan
                </button>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-sm text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>{error}</div>
              </div>
            )}

            {/* Occupancy Selector & Assessment Action */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Building Occupancy Type</label>
                <select
                  value={occupancy}
                  onChange={e => setOccupancy(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
                >
                  {OCCUPANCY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={runAnalysis}
                disabled={!selectedFile}
                className="sm:self-end flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                Assess Blueprint &amp; Generate Improvements
              </button>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {[
                { icon: <ShieldAlert className="w-3.5 h-3.5 text-red-400" />, text: 'NBC 2016 Flaw Checks' },
                { icon: <Target className="w-3.5 h-3.5 text-yellow-400" />, text: 'Defect Coordinate Pins' },
                { icon: <Layers className="w-3.5 h-3.5 text-cyan-400" />, text: 'Revised Drawing Plan' },
                { icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />, text: 'Compliance Scoring' },
              ].map(f => (
                <div key={f.text} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400">
                  {f.icon}
                  <span className="truncate">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Progress Loading State */}
        {isAnalyzing && (
          <div className="max-w-2xl mx-auto py-12">
            <div className="bg-slate-900/70 border border-slate-700/60 rounded-3xl p-10 flex flex-col items-center text-center gap-6 shadow-2xl">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-slate-700 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
                </div>
                <div className="absolute -inset-2 rounded-[28px] border border-violet-500/30 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Evaluating Blueprint</h3>
                <p className="text-sm text-slate-400 mt-1 min-h-6">{analysisPhase}</p>
              </div>
              <div className="w-full space-y-2">
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${analysisPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500 font-mono">
                  <span>Vision Analysis</span>
                  <span>{analysisPct}%</span>
                </div>
              </div>
              <p className="text-xs text-slate-500">Checking architectural geometry against National Building Code clauses.</p>
            </div>
          </div>
        )}

        {/* Results Studio View */}
        {result && (
          <div className="space-y-6">

            {/* Header & Mode Switcher */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-black text-white tracking-tight">Blueprint Evaluation Studio</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${riskCfg.bg} ${riskCfg.color} ${riskCfg.border}`}>
                    {riskCfg.label}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-violet-500/10 text-violet-300 border border-violet-500/20">
                    NBC 2016 Part 4 &amp; 8
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  <span className="font-semibold text-slate-300">{result.filename}</span>
                  {' · '}
                  <span>Engine: {result.ai_model_used}</span>
                  {' · '}
                  <span>Processed in {(result.processing_time_ms / 1000).toFixed(1)}s</span>
                </p>
              </div>

              {/* View Mode Tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <button
                    onClick={() => setViewMode('revised')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'revised'
                        ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Suggested Revised Blueprint
                  </button>
                  <button
                    onClick={() => setViewMode('flaws')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'flaws'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Flaws &amp; Violations View
                  </button>
                  <button
                    onClick={() => setViewMode('split')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'split'
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    Side-by-Side Split
                  </button>
                </div>

                <button
                  onClick={() => {
                    setResult(null)
                    setSelectedFile(null)
                    setPreviewUrl(null)
                    setError(null)
                    setSelectedIssueId(null)
                    setSelectedRevId(null)
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white border border-slate-700/80 hover:border-slate-500 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  New Blueprint
                </button>
              </div>
            </div>

            {/* Score & Flaw Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center flex flex-col justify-center">
                <p className={`text-3xl font-black ${scoreColor}`}>{result.compliance_score}</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">Compliance Index (/100)</p>
              </div>
              {(['critical', 'major', 'minor', 'suggestion'] as Severity[]).map(sev => (
                <div key={sev} className={`${SEV_CFG[sev].bg} border ${SEV_CFG[sev].border} rounded-2xl p-4 text-center flex flex-col justify-center`}>
                  <p className={`text-3xl font-black ${SEV_CFG[sev].color}`}>{countBySev(sev)}</p>
                  <p className="text-xs text-slate-400 mt-1 capitalize font-medium">{SEV_CFG[sev].label} Defects</p>
                </div>
              ))}
            </div>

            {/* Executive Summary */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                Architectural Assessment Summary
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">{result.executive_summary}</p>
            </div>

            {/* Main Interactive Studio Canvas & Issues Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

              {/* Blueprint Drawing Viewer (7 or 8 columns on large screens) */}
              <div className={`${viewMode === 'split' ? 'xl:col-span-12' : 'xl:col-span-7'} space-y-4`}>
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">

                  {/* Viewer Controls Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {viewMode === 'revised' ? '✨ Suggested Revised Blueprint'
                          : viewMode === 'flaws' ? '⚠️ Flaws & Defect Pins'
                          : '↔️ Side-by-Side Architectural Comparison'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {viewMode === 'revised' ? `${result.revised_elements?.length || 0} Improvements Applied` : `${result.issues.length} Flaws Detected`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAnnotations(!showAnnotations)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors border ${
                          showAnnotations
                            ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                            : 'text-slate-400 hover:text-white border-transparent hover:border-slate-700'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {showAnnotations ? 'Hide Overlay' : 'Show Overlay'}
                      </button>
                      <button
                        onClick={() => setZoom(z => Math.min(z + 0.25, 2.5))}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setZoom(z => Math.max(z - 0.25, 0.6))}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setZoom(1)}
                        className="px-2 py-1 rounded-lg text-[10px] font-mono text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Reset Zoom"
                      >
                        {Math.round(zoom * 100)}%
                      </button>
                    </div>
                  </div>

                  {/* Blueprint View Area */}
                  {viewMode === 'split' ? (
                    // ── Split View (Original Flaws vs Suggested Revised Blueprint) ──
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-[#060913] p-4 gap-4">
                      {/* Left: Original with Flaws */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs px-2 text-slate-400">
                          <span className="font-bold text-red-400">1. Original Blueprint (Flaws Detected)</span>
                          <span>{result.issues.length} Issues</span>
                        </div>
                        <div className="relative overflow-auto max-h-[460px] rounded-xl border border-slate-800/80 bg-[#090D18] flex items-center justify-center p-2">
                          <div className="relative inline-block" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                            <img src={result.base64_image || previewUrl || ''} alt="Original Blueprint" className="max-w-full rounded shadow" />
                            {renderFlawOverlay()}
                          </div>
                        </div>
                      </div>

                      {/* Right: Suggested Revised Blueprint */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs px-2 text-slate-400">
                          <span className="font-bold text-emerald-400">2. Suggested Revised Blueprint (Improvements Overlay)</span>
                          <span>{result.revised_elements?.length || 0} Revisions</span>
                        </div>
                        <div className="relative overflow-auto max-h-[460px] rounded-xl border border-emerald-500/20 bg-[#090D18] flex items-center justify-center p-2">
                          <div className="relative inline-block" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                            <img src={result.base64_image || previewUrl || ''} alt="Revised Blueprint" className="max-w-full rounded shadow" />
                            {renderRevisedBlueprintOverlay()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // ── Single View (Revised or Flaws) ──
                    <div className="relative overflow-auto bg-[#060913] min-h-[380px] max-h-[580px] flex items-start justify-center p-4">
                      {result.base64_image || previewUrl ? (
                        <div className="relative inline-block transition-transform duration-150" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                          <img
                            src={result.base64_image || previewUrl || ''}
                            alt="Blueprint Canvas"
                            className="max-w-full rounded-xl shadow-2xl border border-slate-800/60"
                            draggable={false}
                          />
                          {viewMode === 'revised' ? renderRevisedBlueprintOverlay() : renderFlawOverlay()}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-600 gap-3">
                          <FileImage className="w-12 h-12" />
                          <p className="text-sm">Blueprint visual preview unavailable for this format</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Canvas Legend Footer */}
                  <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                    {viewMode === 'revised' ? (
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500" />
                          <span className="text-slate-300">Widened Corridor (1.8m)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded bg-cyan-500/30 border border-cyan-400" />
                          <span className="text-slate-300">New Emergency Fire Door</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500" />
                          <span className="text-slate-300">2-Hr Fire Rated Barrier</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded bg-purple-500/30 border border-purple-400" />
                          <span className="text-slate-300">Accessible Ramp</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded bg-sky-500/30 border border-sky-400" />
                          <span className="text-slate-300">Ventilation Glazing</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 flex-wrap">
                        {(['critical', 'major', 'minor', 'suggestion'] as Severity[]).map(sev => (
                          <div key={sev} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SEV_CFG[sev].dot }} />
                            <span className="text-slate-400 capitalize">{sev}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Element Focus Box */}
                {(activeRev || activeIssue) && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/40 via-slate-900 to-cyan-950/40 border border-violet-500/30 flex items-start gap-3.5">
                    <Target className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-violet-300">
                          {activeRev ? activeRev.id : activeIssue?.id}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {activeRev ? activeRev.title : activeIssue?.title}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {activeRev ? activeRev.description : activeIssue?.description}
                      </p>
                      {(activeRev?.code_reference || activeIssue?.code_reference) && (
                        <p className="text-[11px] text-cyan-400 font-mono mt-1">
                          📋 Ref: {activeRev?.code_reference || activeIssue?.code_reference}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => { setSelectedIssueId(null); setSelectedRevId(null) }}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Issues & Improvements Panel (5 columns on large screens) */}
              <div className={`${viewMode === 'split' ? 'xl:col-span-12' : 'xl:col-span-5'} space-y-4`}>

                {/* Suggested Improvements in Drawing Blueprint */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                  <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-emerald-400" />
                        Suggested Drawing Improvements
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Architectural modifications applied to the new blueprint</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {result.improvements.length} Revisions
                    </span>
                  </div>

                  <div className="divide-y divide-slate-800/80 max-h-[380px] overflow-y-auto">
                    {result.improvements.map(imp => {
                      const isExpanded = expandedImp === imp.id
                      const matchingRev = result.revised_elements?.find(r => r.issue_id === imp.id || r.category === imp.category)
                      const isRevSelected = matchingRev && selectedRevId === matchingRev.id

                      return (
                        <div
                          key={imp.id}
                          className={`px-4 py-3.5 transition-all cursor-pointer ${
                            isRevSelected ? 'bg-emerald-500/10 border-l-2 border-emerald-400' : 'hover:bg-slate-800/40'
                          }`}
                          onClick={() => {
                            setExpandedImp(isExpanded ? null : imp.id)
                            if (matchingRev) {
                              setSelectedRevId(matchingRev.id)
                              setViewMode('revised')
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xs font-black shrink-0 mt-0.5">
                              {imp.priority}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-white truncate">{imp.title}</p>
                                <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded capitalize shrink-0">
                                  {imp.category}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 mt-1 leading-relaxed line-clamp-2">{imp.detail}</p>
                              {imp.estimated_impact && (
                                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{imp.estimated_impact}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Flaws & Issues List */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                  <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        Identified Flaws ({filteredIssues.length})
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Click issue to highlight marker on blueprint</p>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1">
                      {(['all', 'critical', 'major', 'minor'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setSevFilter(f)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize transition-all ${
                            sevFilter === f
                              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {f === 'all' ? `All (${result.issues.length})` : f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="divide-y divide-slate-800/80 max-h-[380px] overflow-y-auto">
                    {filteredIssues.map(issue => {
                      const cfg = SEV_CFG[issue.severity]
                      const isSelected = selectedIssueId === issue.id

                      return (
                        <div
                          key={issue.id}
                          onClick={() => {
                            setSelectedIssueId(isSelected ? null : issue.id)
                            setViewMode('flaws')
                          }}
                          className={`px-4 py-3 cursor-pointer transition-all ${
                            isSelected ? 'bg-slate-800/70 border-l-2 border-violet-400' : 'hover:bg-slate-800/30'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 p-1 rounded-lg ${cfg.bg} border ${cfg.border} ${cfg.color} shrink-0`}>
                              <SevIcon sev={issue.severity} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-mono text-slate-400">{issue.id}</span>
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${cfg.bg} ${cfg.color}`}>
                                  {cfg.label}
                                </span>
                                <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                                  {CAT_LABEL[issue.category] ?? issue.category}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-white mt-1">{issue.title}</p>
                              {issue.location && (
                                <p className="text-[11px] text-slate-400 mt-0.5">📍 {issue.location}</p>
                              )}

                              {isSelected && (
                                <div className="mt-2.5 space-y-2 border-t border-slate-700/60 pt-2">
                                  <p className="text-xs text-slate-300 leading-relaxed">{issue.description}</p>
                                  <div className={`p-2.5 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                                    <p className="text-[11px] font-bold text-white mb-0.5">Recommended Correction</p>
                                    <p className="text-xs text-slate-300 leading-relaxed">{issue.recommendation}</p>
                                  </div>
                                  {issue.code_reference && (
                                    <p className="text-[11px] text-slate-400 font-mono">
                                      📜 Standard: {issue.code_reference}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>

            </div>

            {/* Revised Blueprint Architectural Notes Card */}
            {result.revised_blueprint_notes && (
              <div className="bg-gradient-to-br from-emerald-950/20 via-slate-900/60 to-cyan-950/20 border border-emerald-500/20 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Revised Blueprint Architectural Notes &amp; Specifications
                  </h3>
                  <button
                    onClick={handleCopyNotes}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors"
                  >
                    {copiedNotes ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedNotes ? 'Copied' : 'Copy Notes'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                  {result.revised_blueprint_notes}
                </p>
              </div>
            )}

            {/* Regulatory Disclaimer */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-500 flex items-start gap-3">
              <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <p className="leading-relaxed">{result.disclaimer}</p>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
