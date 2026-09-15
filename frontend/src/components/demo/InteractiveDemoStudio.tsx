import React, { useState, useRef, useEffect } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Info,
  Layers,
  X,
  Sparkles,
  Compass,
  FileText,
  TrendingDown,
  Check,
  ChevronRight,
} from 'lucide-react'
import {
  DEMO_METADATA,
  DEMO_FLOOR_PLAN,
  DEMO_FINDINGS,
  DEMO_COMPLIANCE_SUMMARY,
  type DemoFinding,
} from '../../demo/sampleData'

interface InteractiveDemoStudioProps {
  onNavigate: (route: string) => void
  isEmbedded?: boolean
}

export const InteractiveDemoStudio: React.FC<InteractiveDemoStudioProps> = ({
  onNavigate,
  isEmbedded = false,
}) => {
  // Current selected finding (defaults to first violation: corridor width)
  const [selectedFindingId, setSelectedFindingId] = useState<string>('demo-finding-corridor')
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null)
  const [showSourceModal, setShowSourceModal] = useState<boolean>(false)
  const [guidedStep, setGuidedStep] = useState<number>(1) // 1 to 5

  // Interactive Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1.0)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Active finding object
  const activeFinding =
    DEMO_FINDINGS.find((f) => f.id === selectedFindingId) || DEMO_FINDINGS[0]

  // Automatically update camera / pan when active finding changes
  useEffect(() => {
    if (activeFinding.camera_focus) {
      setZoom(activeFinding.camera_focus.zoom)
      setPan(activeFinding.camera_focus.pan)
    }
  }, [selectedFindingId])

  // Select a finding and sync guided step
  const handleSelectFinding = (finding: DemoFinding) => {
    setSelectedFindingId(finding.id)
    if (finding.key === 'corridor_width') setGuidedStep(2)
    else if (finding.key === 'door_width') setGuidedStep(3)
    else setGuidedStep(4)
  }

  // Handle Pan Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }
  }

  const handleMouseUp = () => setIsDragging(false)

  // Touch gesture support for mobile & tablet screens
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      setPan({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y })
    }
  }

  const handleTouchEnd = () => setIsDragging(false)

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.6), 3.5))
  }

  const handleResetView = () => {
    setZoom(1.0)
    setPan({ x: 0, y: 0 })
  }

  // Stepper navigation
  const nextStep = () => {
    if (guidedStep === 1) {
      handleSelectFinding(DEMO_FINDINGS[0]) // Corridor
    } else if (guidedStep === 2) {
      handleSelectFinding(DEMO_FINDINGS[1]) // Door
    } else if (guidedStep === 3) {
      handleSelectFinding(DEMO_FINDINGS[2]) // Passing
    } else if (guidedStep === 4) {
      setGuidedStep(5)
    } else {
      onNavigate('/projects/new')
    }
  }

  const prevStep = () => {
    if (guidedStep === 2) {
      setGuidedStep(1)
      handleResetView()
    } else if (guidedStep === 3) {
      handleSelectFinding(DEMO_FINDINGS[0])
    } else if (guidedStep === 4) {
      handleSelectFinding(DEMO_FINDINGS[1])
    } else if (guidedStep === 5) {
      handleSelectFinding(DEMO_FINDINGS[2])
    }
  }

  // Bounding box for floor plan: 0 to 12 in X, 0 to 9 in Y
  const margin = 1.0
  const viewX = -margin
  const viewY = -margin
  const viewWidth = 12.0 + margin * 2
  const viewHeight = 9.0 + margin * 2

  return (
    <div className="w-full flex flex-col bg-[#050811] text-slate-100 font-sans select-none rounded-2xl overflow-hidden border border-[#1A2234] shadow-2xl">
      {/* Top Header: Demo Banner & Summary Pills */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 bg-[#080D1A] border-b border-[#1A2234] flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] sm:text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>INTERACTIVE DEMO</span>
          </div>

          <div className="text-left">
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>{DEMO_METADATA.project_name}</span>
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-400">
              Precomputed deterministic sample project · Zero user database writes
            </p>
          </div>
        </div>

        {/* Compliance Transparency Badges */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-[#0F1626] border border-[#1E293B] text-[10px] sm:text-[11px] text-slate-300 font-mono">
            <strong>7</strong> Checks
          </div>
          <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-[10px] sm:text-[11px] text-emerald-300 font-mono flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-400" />
            <span><strong>5</strong> Passed</span>
          </div>
          <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-rose-950/40 border border-rose-500/40 text-[10px] sm:text-[11px] text-rose-300 font-mono flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span><strong>2</strong> Violations</span>
          </div>

          <button
            onClick={() => onNavigate('/projects/new')}
            className="hidden sm:flex ml-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-white hover:bg-slate-100 text-black text-xs font-bold transition-all active:scale-95 shadow-md items-center gap-1.5 shrink-0"
          >
            <span>Analyze Your Blueprint</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Guided Walkthrough Controller (30-60 second guided experience) */}
      <div className="px-4 sm:px-6 py-2.5 bg-[#0B1020] border-b border-[#1A2234] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-left">
          <span className="text-indigo-400 font-mono font-bold text-[11px] uppercase tracking-wider shrink-0">
            Step {guidedStep}/5:
          </span>
          <span className="text-slate-200 text-xs font-medium">
            {guidedStep === 1 && 'Explore Floor Plan & Detected Regulatory Finding Markers'}
            {guidedStep === 2 && 'Inspect Violation 1: Corridor Clear Width Shortfall (1.18m vs 1.50m)'}
            {guidedStep === 3 && 'Inspect Violation 2: Office Door Leaf Clear Width (0.75m vs 0.90m)'}
            {guidedStep === 4 && 'Review Verified Passing Checks (Living Area & 12.4m Egress Travel)'}
            {guidedStep === 5 && 'Audit Your Own Blueprints with the Production Pipeline'}
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {guidedStep > 1 && (
            <button
              onClick={prevStep}
              className="px-2.5 py-1 rounded-lg bg-[#141C2E] hover:bg-[#1C263D] text-slate-300 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Previous</span>
            </button>
          )}

          <button
            onClick={nextStep}
            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
          >
            <span>{guidedStep === 5 ? 'Start Your Analysis →' : 'Next Step →'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Split Layout: Left Blueprint Canvas, Right Findings Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 bg-[#050811]">
        {/* Left Column: Interactive CAD Floor Plan Viewport (7 cols) */}
        <div className="lg:col-span-7 border-b lg:border-b-0 lg:border-r border-[#1A2234] relative flex flex-col bg-[#04060E]">
          {/* Viewport Floating Controls */}
          <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 z-10 flex items-center gap-1 bg-[#0A0F1D]/90 backdrop-blur-md px-2 py-1 rounded-xl border border-[#1E293B] shadow-lg text-xs">
            <button
              onClick={() => handleZoom(0.2)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom(-0.2)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="px-2 py-0.5 rounded-lg hover:bg-slate-800 text-slate-300 text-[10px] font-mono transition-colors"
              title="Fit to Screen"
            >
              Fit
            </button>
            <span className="text-[10px] text-slate-500 font-mono pl-1 border-l border-slate-700">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Compass / North Indicator (Top Right) */}
          <div className="absolute top-2.5 sm:top-3 right-2.5 sm:right-3 z-10 flex items-center gap-1 bg-[#0A0F1D]/90 backdrop-blur-md px-2 py-1 rounded-lg border border-[#1E293B] text-[10px] text-slate-400 font-mono">
            <Compass className="w-3 h-3 text-indigo-400" />
            <span>N</span>
          </div>

          {/* Main SVG Canvas with touch & mouse drag */}
          <div
            className="w-full h-[320px] sm:h-[420px] lg:h-[560px] overflow-hidden cursor-grab active:cursor-grabbing relative touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <svg
              viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
              className="w-full h-full"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <defs>
                {/* Architectural Precision Grid Pattern */}
                <pattern id="demo-cad-grid" width="1.0" height="1.0" patternUnits="userSpaceOnUse">
                  <path d="M 1.0 0 L 0 0 0 1.0" fill="none" stroke="#0F172A" strokeWidth="0.02" />
                  <circle cx="1.0" cy="1.0" r="0.03" fill="#1E293B" />
                </pattern>

                {/* Subtle Hatching for Walls */}
                <pattern id="wall-hatch" width="0.2" height="0.2" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="0.2" stroke="#334155" strokeWidth="0.04" />
                </pattern>
              </defs>

              {/* Background Grid */}
              <rect x={viewX} y={viewY} width={viewWidth} height={viewHeight} fill="url(#demo-cad-grid)" />

              {/* 1. ROOMS LAYER */}
              {DEMO_FLOOR_PLAN.floors[0].rooms.map((room) => {
                const isCorridor = room.id === 'room-corridor'
                const isSelectedCorridor = isCorridor && activeFinding.key === 'corridor_width'
                const isSelectedRoom = activeFinding.entity_id === room.id
                const isHovered = hoveredEntityId === room.id

                // Points string for SVG polygon
                const pointsStr = room.boundary.vertices.map((v) => `${v.x},${v.y}`).join(' ')

                // Room color theme
                let fillColor = 'rgba(15, 23, 42, 0.65)'
                let strokeColor = '#334155'
                let strokeWidth = '0.04'

                if (isCorridor) {
                  fillColor = isSelectedCorridor
                    ? 'rgba(244, 63, 94, 0.20)'
                    : 'rgba(244, 63, 94, 0.08)'
                  strokeColor = isSelectedCorridor ? '#F43F5E' : 'rgba(244, 63, 94, 0.45)'
                  strokeWidth = isSelectedCorridor ? '0.07' : '0.04'
                } else if (isSelectedRoom) {
                  fillColor = 'rgba(16, 185, 129, 0.16)'
                  strokeColor = '#10B981'
                  strokeWidth = '0.07'
                } else if (isHovered) {
                  fillColor = 'rgba(99, 102, 241, 0.15)'
                  strokeColor = '#6366F1'
                }

                // Centroid coordinates (for corridor, offset to the left at x=2.5 to avoid any doors or callouts)
                const cx = isCorridor
                  ? 2.5
                  : room.boundary.vertices.reduce((acc, v) => acc + v.x, 0) / room.boundary.vertices.length
                const cy =
                  room.boundary.vertices.reduce((acc, v) => acc + v.y, 0) / room.boundary.vertices.length

                return (
                  <g
                    key={room.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredEntityId(room.id)}
                    onMouseLeave={() => setHoveredEntityId(null)}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isCorridor) {
                        handleSelectFinding(DEMO_FINDINGS[0])
                      } else {
                        const passFinding = DEMO_FINDINGS.find((f) => f.entity_id === room.id)
                        if (passFinding) handleSelectFinding(passFinding)
                      }
                    }}
                  >
                    <polygon
                      points={pointsStr}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={isSelectedCorridor ? '0.12 0.06' : 'none'}
                      className="transition-colors duration-200"
                    />

                    {/* Clean Room Label */}
                    <text
                      x={cx}
                      y={isCorridor ? cy : cy - 0.10}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isCorridor ? '#FDA4AF' : isSelectedRoom ? '#6EE7B7' : '#CBD5E1'}
                      fontSize="0.20"
                      fontFamily="Outfit, sans-serif"
                      fontWeight="600"
                      letterSpacing="0.06em"
                      pointerEvents="none"
                    >
                      {room.label}
                    </text>

                    {/* Room Area Metric (omitted on corridor to prevent clutter) */}
                    {!isCorridor && room.area_m2 && (
                      <text
                        x={cx}
                        y={cy + 0.14}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={isSelectedRoom ? '#A7F3D0' : '#64748B'}
                        fontSize="0.15"
                        fontFamily="monospace"
                        fontWeight="500"
                        pointerEvents="none"
                      >
                        {room.area_m2.toFixed(1)} m²
                      </text>
                    )}
                  </g>
                )
              })}

              {/* 2. WALLS LAYER (Double architectural line thickness) */}
              {DEMO_FLOOR_PLAN.floors[0].walls.map((wall) =>
                wall.segments.map((seg, sIdx) => {
                  const isExterior = wall.wall_type === 'exterior'
                  return (
                    <line
                      key={`${wall.id}-${sIdx}`}
                      x1={seg.start.x}
                      y1={seg.start.y}
                      x2={seg.end.x}
                      y2={seg.end.y}
                      stroke={isExterior ? '#64748B' : '#475569'}
                      strokeWidth={wall.thickness_m || 0.15}
                      strokeLinecap="round"
                    />
                  )
                })
              )}

              {/* 3. WINDOW OPENINGS (Cyan architectural glazing symbols) */}
              {DEMO_FLOOR_PLAN.floors[0].openings
                .filter((op) => op.opening_type === 'window')
                .map((win) => {
                  const ww = win.width_m || 1.8
                  return (
                    <g key={win.id}>
                      <line
                        x1={win.position.x - ww / 2}
                        y1={win.position.y}
                        x2={win.position.x + ww / 2}
                        y2={win.position.y}
                        stroke="#38BDF8"
                        strokeWidth="0.08"
                      />
                      <line
                        x1={win.position.x - ww / 2}
                        y1={win.position.y}
                        x2={win.position.x + ww / 2}
                        y2={win.position.y}
                        stroke="#0284C7"
                        strokeWidth="0.03"
                      />
                    </g>
                  )
                })}

              {/* 4. DOORS LAYER (Door leaf line + curved swing arc) */}
              {DEMO_FLOOR_PLAN.floors[0].openings
                .filter((op) => op.opening_type.includes('door') || op.opening_type.includes('exit'))
                .map((door) => {
                  const isViolatedDoor = door.id === 'op-bed2-door'
                  const isSelectedDoor = activeFinding.entity_id === door.id
                  const isExit = door.id === 'op-main-exit'

                  const dw = door.width_m || 0.85
                  const px = door.position.x
                  const py = door.position.y

                  let doorColor = '#38BDF8'
                  if (isViolatedDoor) {
                    doorColor = '#F97316'
                  } else if (isExit) {
                    doorColor = '#10B981'
                  }

                  return (
                    <g
                      key={door.id}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredEntityId(door.id)}
                      onMouseLeave={() => setHoveredEntityId(null)}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isViolatedDoor) {
                          handleSelectFinding(DEMO_FINDINGS[1])
                        } else if (isExit) {
                          handleSelectFinding(DEMO_FINDINGS[5])
                        }
                      }}
                    >
                      {/* Door clear opening line */}
                      <line
                        x1={px - dw / 2}
                        y1={py}
                        x2={px + dw / 2}
                        y2={py}
                        stroke={doorColor}
                        strokeWidth={isSelectedDoor ? '0.07' : '0.04'}
                      />

                      {/* Realistic Door Leaf Swing Arc */}
                      {!isExit && (
                        <path
                          d={`M ${px - dw / 2} ${py} A ${dw} ${dw} 0 0 1 ${px + dw / 2} ${py + dw * 0.8}`}
                          fill="none"
                          stroke={doorColor}
                          strokeWidth="0.025"
                          strokeDasharray="0.06 0.03"
                          opacity="0.6"
                        />
                      )}

                      {/* Violated Door Visual Marker */}
                      {isViolatedDoor && (
                        <g>
                          <circle
                            cx={px}
                            cy={py}
                            r={isSelectedDoor ? 0.32 : 0.24}
                            fill="rgba(249, 115, 22, 0.20)"
                            stroke="#F97316"
                            strokeWidth="0.03"
                            strokeDasharray={isSelectedDoor ? '0.06 0.03' : 'none'}
                          />
                          {/* Callout tag placed INSIDE Bedroom 2 (Y=5.35) ONLY when door finding is selected */}
                          {isSelectedDoor && (
                            <g>
                              <rect
                                x={px - 1.15}
                                y={py + 0.35}
                                width="2.3"
                                height="0.42"
                                rx="0.08"
                                fill="#261005"
                                stroke="#F97316"
                                strokeWidth="0.03"
                              />
                              <text
                                x={px}
                                y={py + 0.62}
                                textAnchor="middle"
                                fill="#FED7AA"
                                fontSize="0.16"
                                fontFamily="monospace"
                                fontWeight="800"
                              >
                                0.75m (REQ: ≥ 0.90m)
                              </text>
                            </g>
                          )}
                        </g>
                      )}

                      {/* Main Exit Visual Marker (Compact & clean at wall edge) */}
                      {isExit && (
                        <g>
                          <rect
                            x="11.45"
                            y="3.95"
                            width="1.0"
                            height="0.52"
                            rx="0.08"
                            fill="#042F1A"
                            stroke="#10B981"
                            strokeWidth="0.03"
                          />
                          <text
                            x="11.95"
                            y="4.28"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#34D399"
                            fontSize="0.16"
                            fontFamily="Outfit, sans-serif"
                            fontWeight="800"
                          >
                            EXIT →
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}

              {/* 5. EGRESS PATH TRACE (Drawn cleanly when travel distance is active) */}
              {activeFinding.key === 'travel_distance' && (
                <g>
                  <polyline
                    points="3.5,1.81 3.55,3.62 6.0,4.21 11.45,4.21"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="0.06"
                    strokeDasharray="0.15 0.08"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Origin node */}
                  <circle cx="3.5" cy="1.81" r="0.20" fill="#10B981" stroke="#ffffff" strokeWidth="0.02" />
                  {/* Path annotation tag */}
                  <rect x="5.1" y="3.8" width="2.0" height="0.36" rx="0.06" fill="#042F1A" stroke="#10B981" strokeWidth="0.02" />
                  <text
                    x="6.1"
                    y="4.04"
                    textAnchor="middle"
                    fill="#34D399"
                    fontSize="0.14"
                    fontFamily="monospace"
                    fontWeight="700"
                  >
                    12.4m (Pass ≤ 30m)
                  </text>
                </g>
              )}

              {/* 6. CORRIDOR DIMENSION CALLOUT (Isolated at X=8.5 between Bed 2 and Bath) */}
              {activeFinding.key === 'corridor_width' && (
                <g>
                  {/* Vertical dimension line across corridor clear width */}
                  <line x1="8.5" y1="3.62" x2="8.5" y2="4.80" stroke="#F43F5E" strokeWidth="0.04" />
                  <line x1="8.25" y1="3.62" x2="8.75" y2="3.62" stroke="#F43F5E" strokeWidth="0.04" />
                  <line x1="8.25" y1="4.80" x2="8.75" y2="4.80" stroke="#F43F5E" strokeWidth="0.04" />

                  {/* Compact Red Dimension Badge */}
                  <rect
                    x="7.35"
                    y="3.98"
                    width="2.3"
                    height="0.44"
                    rx="0.08"
                    fill="#2E0812"
                    stroke="#F43F5E"
                    strokeWidth="0.03"
                  />
                  <text
                    x="8.5"
                    y="4.27"
                    textAnchor="middle"
                    fill="#FECDD3"
                    fontSize="0.16"
                    fontFamily="monospace"
                    fontWeight="800"
                  >
                    1.18m (REQ: ≥ 1.50m)
                  </text>
                </g>
              )}
            </svg>

            {/* Scale Bar at Bottom-Left */}
            <div className="absolute bottom-3 left-3 bg-[#0A0F1D]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#1E293B] text-[10px] text-slate-400 font-mono flex items-center gap-3">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center">
                  <div className="w-12 h-1 bg-indigo-500 rounded-l" />
                  <div className="w-12 h-1 bg-slate-600 rounded-r" />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400">
                  <span>0</span>
                  <span>2.5m</span>
                  <span>5.0m</span>
                </div>
              </div>
              <span className="border-l border-slate-700 pl-2 text-slate-300">SCALE 1:100</span>
            </div>

            {/* Legend at Bottom-Right */}
            <div className="absolute bottom-3 right-3 bg-[#0A0F1D]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-[#1E293B] text-[11px] text-slate-300 flex items-center gap-3 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500/60 border border-rose-400" />
                <span>Violation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500/50 border border-emerald-400" />
                <span>Passing Check</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-cyan-500/40 border border-cyan-400" />
                <span>Door / Opening</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Violation & Finding Inspector Panel (5 cols) */}
        <div className="lg:col-span-5 p-6 flex flex-col justify-between bg-[#080C17] overflow-y-auto max-h-[620px]">
          <div>
            {/* Sidebar Findings Selector Tabs */}
            <div className="mb-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-2">
                SELECT A FINDING TO INSPECT BLUEPRINT:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_FINDINGS.map((f) => {
                  const isSelected = f.id === selectedFindingId
                  const isViol = f.category === 'violation'
                  return (
                    <button
                      key={f.id}
                      onClick={() => handleSelectFinding(f)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? isViol
                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                            : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                          : isViol
                          ? 'bg-[#151C2C] hover:bg-[#1E273D] text-rose-300 border border-rose-500/30'
                          : 'bg-[#121824] hover:bg-[#1A2234] text-slate-300 border border-[#1E293B]'
                      }`}
                    >
                      {isViol ? (
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                      ) : (
                        <Check className="w-3 h-3 shrink-0" />
                      )}
                      <span className="truncate max-w-[130px]">{f.title}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Active Finding Card Header */}
            <div className="p-4 rounded-2xl bg-[#0D1424] border border-[#1E293B] mb-4 text-left">
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase font-mono ${
                    activeFinding.status === 'FAIL'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {activeFinding.status === 'FAIL' ? '✕ NON-COMPLIANCE FAIL' : '✓ VERIFIED COMPLIANT'}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {activeFinding.rule_id}
                </span>
              </div>

              <h3 className="text-base font-bold text-white leading-snug">
                {activeFinding.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Entity: <strong className="text-slate-200">{activeFinding.entity_name}</strong>
              </p>

              {/* Comparison Metric Grid */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#1E293B]">
                <div className="p-2.5 rounded-xl bg-[#070A12] border border-[#182236] text-center">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">
                    Measured
                  </span>
                  <span
                    className={`text-sm font-black font-mono mt-0.5 block ${
                      activeFinding.status === 'FAIL' ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {activeFinding.measured_value} {activeFinding.unit}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#070A12] border border-[#182236] text-center">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">
                    Required
                  </span>
                  <span className="text-sm font-black font-mono text-slate-200 mt-0.5 block">
                    {activeFinding.rule_id.includes('TD') ? '≤ ' : '≥ '}
                    {activeFinding.required_value} {activeFinding.unit}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#070A12] border border-[#182236] text-center">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">
                    Difference
                  </span>
                  <span
                    className={`text-sm font-black font-mono mt-0.5 block ${
                      activeFinding.difference < 0 && activeFinding.status === 'FAIL'
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {activeFinding.difference > 0 ? `+${activeFinding.difference}` : activeFinding.difference} {activeFinding.unit}
                  </span>
                </div>
              </div>
            </div>

            {/* Verified NBC Statutory Source Citation */}
            <div className="p-3.5 rounded-xl bg-[#0A101F] border border-[#1A253D] mb-3 text-left">
              <div className="flex items-center justify-between text-xs font-mono text-indigo-400 font-bold mb-1">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{activeFinding.regulation_source}</span>
                </div>
                <span className="text-slate-400">Page {activeFinding.source_page}</span>
              </div>
              <p className="text-xs text-slate-300 font-mono">
                {activeFinding.clause} · {activeFinding.part}
              </p>
              <button
                onClick={() => setShowSourceModal(true)}
                className="mt-2 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3 h-3" />
                <span>View Verbatim NBC Code Excerpt →</span>
              </button>
            </div>

            {/* Why Does This Fail? Plain-English Explanation */}
            <div className="p-3.5 rounded-xl bg-[#0A101F] border border-[#1A253D] mb-3 text-left">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold block mb-1">
                WHY DOES THIS {activeFinding.status === 'FAIL' ? 'FAIL' : 'PASS'}?
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeFinding.why_it_fails_or_passes}
              </p>
              <p className="text-[11px] text-slate-400 mt-2 italic bg-[#060912] p-2 rounded-lg border border-[#141C2E]">
                {activeFinding.architecture_rationale}
              </p>
            </div>

            {/* How To Fix It (Actionable Advisory for Violations) */}
            {activeFinding.how_to_fix && (
              <div className="p-3.5 rounded-xl bg-[#0E1526] border border-[#22304C] mb-3 text-left">
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-1">
                  ACTIONABLE CORRECTION RECOMMENDATION:
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {activeFinding.how_to_fix}
                </p>
                <span className="text-[10px] text-slate-400 block mt-1">
                  * Advisory recommendation subject to structural grid & MEP coordination.
                </span>

                {/* Conceptual Before / After Visual Diagram */}
                {activeFinding.before_visual && activeFinding.after_visual && (
                  <div className="mt-3 pt-3 border-t border-[#1C263D] grid grid-cols-2 gap-2 text-center text-xs font-mono">
                    <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/30">
                      <span className="text-[10px] text-rose-400 block uppercase font-bold">Current (Before)</span>
                      <strong className="text-white text-sm block mt-0.5">{activeFinding.before_visual.dimension}</strong>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{activeFinding.before_visual.annotation}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-400 block uppercase font-bold">Compliant (After)</span>
                      <strong className="text-white text-sm block mt-0.5">{activeFinding.after_visual.dimension}</strong>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{activeFinding.after_visual.annotation}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Next / Prev Finding Navigation */}
          <div className="pt-3 border-t border-[#1A2234] flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              Try clicking any highlighted room or doorway on the blueprint canvas.
            </div>

            <button
              onClick={() => {
                const currentIndex = DEMO_FINDINGS.findIndex((f) => f.id === selectedFindingId)
                const nextIndex = (currentIndex + 1) % DEMO_FINDINGS.length
                handleSelectFinding(DEMO_FINDINGS[nextIndex])
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#141C2E] hover:bg-[#1E2A44] text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Next Finding</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Verbatim NBC Code Modal */}
      {showSourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-xl w-full bg-[#0D1220] border border-[#232F4A] rounded-2xl p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setShowSourceModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold uppercase mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>National Building Code of India (NBC 2016)</span>
            </div>

            <h4 className="text-base font-bold text-white">
              {activeFinding.clause} — {activeFinding.rule_title}
            </h4>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              {activeFinding.volume} · {activeFinding.part} · Page {activeFinding.source_page}
            </div>

            <div className="mt-4 p-4 rounded-xl bg-[#060912] border border-[#1A2234] font-mono text-xs text-slate-200 leading-relaxed">
              {activeFinding.verbatim_nbc_text}
            </div>

            <div className="mt-4 text-[11px] text-slate-400">
              Verified statutory clause from official Bureau of Indian Standards (BIS) NBC 2016 publications.
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowSourceModal(false)}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
