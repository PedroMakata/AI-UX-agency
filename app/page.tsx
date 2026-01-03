'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  Loader2,
  FolderOpen,
  Calendar,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { useProjects, type Project } from '@/hooks/use-projects';

const PROJECT_PHASES = ['Research', 'Strategy', 'Design', 'Prototype', 'Done'];

function getCalculatedPhase(project: Project): number {
  const stats = project.stats;
  if (!stats) return 0;

  if (stats.prototypes > 0) return 4;
  if (stats.wireframes > 0) return 3;
  if (stats.messages > 5) return 2;
  if (stats.files > 0 || stats.messages > 0) return 1;
  return 0;
}

function getProjectPhase(project: Project): number {
  // Use manual phase if set, otherwise calculate
  const manualPhase = project.settings?.currentPhase;
  if (typeof manualPhase === 'number' && manualPhase >= 0) {
    return manualPhase;
  }
  return getCalculatedPhase(project);
}

function getProjectProgress(project: Project): number {
  const phase = getProjectPhase(project);
  return (phase / 4) * 100;
}

export default function DashboardPage() {
  const router = useRouter();
  const { projects, loading, error, createProject, deleteProject, updateProject, refresh } = useProjects();
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showPhaseDropdown, setShowPhaseDropdown] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    client_name: '',
    client_email: '',
  });

  const handleSetPhase = async (projectId: string, phaseIndex: number) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    await updateProject(projectId, {
      settings: {
        ...project.settings,
        currentPhase: phaseIndex,
      },
    });
    setShowPhaseDropdown(null);
    refresh();
  };

  // Filter out the Default Project from display
  const visibleProjects = projects.filter(p => p.name !== 'Default Project');
  const activeProjects = visibleProjects.filter(p => p.status === 'active');
  const completedProjects = visibleProjects.filter(p => p.status === 'completed');

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;

    setCreating(true);
    const project = await createProject(newProject);
    setCreating(false);

    if (project) {
      setShowNewProjectModal(false);
      setNewProject({ name: '', description: '', client_name: '', client_email: '' });
      router.push(`/projects/${project.id}`);
    }
  };

  const handleDeleteProject = async () => {
    if (!showDeleteModal) return;

    setDeleting(true);
    await deleteProject(showDeleteModal);
    setDeleting(false);
    setShowDeleteModal(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Chyba</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Přehled vašich projektů
            </p>
          </div>
          <Button size="lg" onClick={() => setShowNewProjectModal(true)}>
            <Plus className="mr-2 h-5 w-5" />
            Nový Projekt
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Celkem projektů</p>
                <p className="text-3xl font-bold">{projects.length}</p>
              </div>
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktivní projekty</p>
                <p className="text-3xl font-bold text-blue-600">{activeProjects.length}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dokončené projekty</p>
                <p className="text-3xl font-bold text-green-600">{completedProjects.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </Card>
        </div>

        {/* Projects List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Projekty</h2>
          {projects.length === 0 ? (
            <Card className="p-12 text-center">
              <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Zatím nemáte žádné projekty</h3>
              <p className="text-muted-foreground mb-6">
                Vytvořte svůj první projekt a začněte spolupracovat s AI týmem
              </p>
              <Button onClick={() => setShowNewProjectModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Vytvořit první projekt
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => {
                const phase = getProjectPhase(project);
                const progress = getProjectProgress(project);

                return (
                  <Card
                    key={project.id}
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer relative group"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteModal(project.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                      </div>

                      {project.client_name && (
                        <p className="text-sm text-muted-foreground">
                          Klient: {project.client_name}
                        </p>
                      )}

                      {/* Progress Line with Phase Selector */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowPhaseDropdown(showPhaseDropdown === project.id ? null : project.id);
                              }}
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              <span>Fáze: {PROJECT_PHASES[phase]}</span>
                              <ChevronDown className="h-3 w-3" />
                            </button>
                            {showPhaseDropdown === project.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPhaseDropdown(null);
                                  }}
                                />
                                <div className="absolute top-full left-0 mt-1 bg-background border rounded-md shadow-lg z-50 py-1 min-w-32">
                                  {PROJECT_PHASES.map((phaseName, idx) => (
                                    <button
                                      key={phaseName}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetPhase(project.id, idx);
                                      }}
                                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors ${
                                        idx === phase ? 'bg-primary/10 text-primary font-medium' : ''
                                      }`}
                                    >
                                      {phaseName}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          {PROJECT_PHASES.map((phaseName, idx) => (
                            <span
                              key={phaseName}
                              className={idx <= phase ? 'text-primary font-medium' : ''}
                            >
                              •
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(project.created_at).toLocaleDateString('cs-CZ')}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          project.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : project.status === 'active'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {project.status === 'completed' ? 'Dokončeno' :
                           project.status === 'active' ? 'Aktivní' : 'Archivováno'}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg p-6 m-4">
            <h2 className="text-2xl font-bold mb-6">Nový Projekt</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Název projektu *</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Název vašeho projektu"
                />
              </div>

              <div>
                <Label htmlFor="description">Popis</Label>
                <Textarea
                  id="description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Stručný popis projektu"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="client_name">Jméno klienta</Label>
                <Input
                  id="client_name"
                  value={newProject.client_name}
                  onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })}
                  placeholder="Jméno klienta (volitelné)"
                />
              </div>

              <div>
                <Label htmlFor="client_email">Email klienta</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={newProject.client_email}
                  onChange={(e) => setNewProject({ ...newProject, client_email: e.target.value })}
                  placeholder="email@klient.cz (volitelné)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewProjectModal(false);
                  setNewProject({ name: '', description: '', client_name: '', client_email: '' });
                }}
              >
                Zrušit
              </Button>
              <Button onClick={handleCreateProject} disabled={!newProject.name.trim() || creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Vytvořit projekt
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="flex items-center gap-3 text-destructive mb-4">
              <AlertTriangle className="h-8 w-8" />
              <h2 className="text-xl font-bold">Smazat projekt</h2>
            </div>

            <p className="text-muted-foreground mb-6">
              Opravdu chcete tento projekt smazat? Tato akce je nevratná a všechna data projektu budou ztracena.
            </p>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(null)}
                disabled={deleting}
              >
                Zrušit
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteProject}
                disabled={deleting}
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Smazat projekt
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
