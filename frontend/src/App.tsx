import React, { useState, useEffect } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
  useSearchParams,
} from 'react-router-dom'
import { Navbar } from './components/common/Navbar'
import { LandingPage } from './pages/LandingPage'
import { HowItWorksPage } from './pages/HowItWorksPage'
import { DemoPage } from './pages/DemoPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { NewProjectPage } from './pages/NewProjectPage'
import { AnalysisProgressPage } from './pages/AnalysisProgressPage'
import { ProjectWorkspacePage } from './pages/ProjectWorkspacePage'
import { apiClient } from './api/client'
import type { Project } from './types/project'

const AppShell: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<Project | null>(null)

  // Fetch real user projects from backend
  const fetchProjects = async () => {
    try {
      const res = await apiClient.listProjects()
      setProjects(res.items || [])
    } catch (err) {
      console.error('Failed to fetch projects', err)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  // Auto-scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const handleDeleteProject = async (projectId: string) => {
    try {
      await apiClient.deleteProject(projectId)
      await fetchProjects()
      if (activeProject?.id === projectId) {
        setActiveProject(null)
      }
    } catch (err) {
      console.error('Failed to delete project', err)
    }
  }

  // Unified dark theme across all routes
  const isDarkTheme = true

  // Check if current route is within a project workspace
  const isWorkspaceRoute =
    location.pathname.startsWith('/projects/') &&
    !location.pathname.startsWith('/projects/new') &&
    !location.pathname.includes('/analyze')

  // Helper component for workspace routes
  const WorkspaceRouteWrapper = ({ tab }: { tab: string }) => {
    const { id } = useParams<{ id: string }>()
    const project = projects.find((p) => p.id === id)

    // If project not found and list is loaded, redirect to projects
    if (!project && projects.length > 0) {
      navigate('/projects')
      return null
    }

    // While projects are still loading, use a minimal stub with the real ID
    const resolvedProject = project || {
      id: id || '',
      name: 'Loading...',
      building_type: '',
      occupancy_type: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return (
      <ProjectWorkspacePage
        project={resolvedProject}
        initialTab={tab}
        onNavigate={(route) => navigate(route)}
      />
    )
  }

  // Helper component for analysis progress route
  const ProgressRouteWrapper = () => {
    const { id } = useParams<{ id: string }>()
    const [searchParams] = useSearchParams()
    const runId = searchParams.get('runId') || ''

    const resolvedProject = projects.find((p) => p.id === id) || {
      id: id || '',
      name: 'Loading...',
      building_type: '',
      occupancy_type: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return (
      <AnalysisProgressPage
        project={resolvedProject}
        runId={runId}
        onNavigate={(route) => navigate(route)}
      />
    )
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDarkTheme ? 'bg-[#0B0F17]' : 'bg-[#F8FAFC]'}`}>
      {/* Global Navbar */}
      <Navbar
        theme={isDarkTheme ? 'dark' : 'light'}
        currentRoute={location.pathname}
        projectName={activeProject?.name}
        onNavigate={(route) => navigate(route)}
        onAnalyzeBlueprint={() => navigate('/projects/new')}
      />

      {/* Page Routing */}
      <main className="flex-1 flex flex-col">
        <Routes>
          {/* Screen 1: Landing Page */}
          <Route path="/" element={<LandingPage onNavigate={(r) => navigate(r)} />} />

          {/* Screen 2: How It Works */}
          <Route
            path="/how-it-works"
            element={<HowItWorksPage onNavigate={(r) => navigate(r)} />}
          />

          {/* Screen 3: Demo Experience */}
          <Route
            path="/how-it-works/demo"
            element={<DemoPage onNavigate={(r) => navigate(r)} />}
          />
          <Route
            path="/demo"
            element={<DemoPage onNavigate={(r) => navigate(r)} />}
          />

          {/* Screen 4: Projects Dashboard */}
          <Route
            path="/projects"
            element={
              <ProjectsPage
                projects={projects}
                onDeleteProject={handleDeleteProject}
                onSelectProject={(id) => {
                  const proj = projects.find((p) => p.id === id)
                  if (proj) setActiveProject(proj)
                  navigate(`/projects/${id}`)
                }}
                onNavigate={(r) => navigate(r)}
              />
            }
          />

          {/* Screen 5: Create Project / Upload */}
          <Route
            path="/projects/new"
            element={
              <NewProjectPage
                onNavigate={(r) => navigate(r)}
                onProjectCreated={async (projectId) => {
                  await fetchProjects()
                }}
              />
            }
          />

          {/* Screen 6: Analysis Progress */}
          <Route path="/projects/:id/analyze" element={<ProgressRouteWrapper />} />

          {/* Screen 7 & 8: Project Workspace Tabs */}
          <Route path="/projects/:id" element={<WorkspaceRouteWrapper tab="overview" />} />
          <Route path="/projects/:id/floor-plan" element={<WorkspaceRouteWrapper tab="floor-plan" />} />
          <Route path="/projects/:id/compliance" element={<WorkspaceRouteWrapper tab="compliance" />} />
          <Route path="/projects/:id/violations" element={<WorkspaceRouteWrapper tab="violations" />} />
          <Route path="/projects/:id/measurements" element={<WorkspaceRouteWrapper tab="measurements" />} />
          <Route path="/projects/:id/egress" element={<WorkspaceRouteWrapper tab="egress" />} />
          <Route path="/projects/:id/assistant" element={<WorkspaceRouteWrapper tab="assistant" />} />
          <Route path="/projects/:id/report" element={<WorkspaceRouteWrapper tab="report" />} />
        </Routes>
      </main>
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
