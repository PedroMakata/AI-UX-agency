'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ProjectStats {
  files: number;
  messages: number;
  wireframes: number;
  prototypes: number;
}

export interface CustomAgent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  systemPrompt: string;
  capabilities?: string[];
  tools?: string[];
}

export interface ProjectSettings {
  agents: string[];
  customAgents: CustomAgent[];
  agentPromptOverrides?: Record<string, string>;
  currentPhase?: number;
  notionDatabaseId?: string;
  lastNotionSync?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'completed';
  client_name?: string;
  client_email?: string;
  settings?: ProjectSettings;
  created_at: string;
  updated_at: string;
  stats?: ProjectStats;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch projects');
      }

      setProjects(data.projects || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = async (data: {
    name: string;
    description?: string;
    client_name?: string;
    client_email?: string;
  }): Promise<Project | null> => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to create project');
      }

      await fetchProjects();
      return result.project;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      return null;
    }
  };

  const deleteProject = async (projectId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to delete project');
      }

      await fetchProjects();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      return false;
    }
  };

  const updateProject = async (projectId: string, data: Partial<Project>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to update project');
      }

      await fetchProjects();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
      return false;
    }
  };

  // Calculate total stats
  const totalStats: ProjectStats = projects.reduce(
    (acc, project) => ({
      files: acc.files + (project.stats?.files || 0),
      messages: acc.messages + (project.stats?.messages || 0),
      wireframes: acc.wireframes + (project.stats?.wireframes || 0),
      prototypes: acc.prototypes + (project.stats?.prototypes || 0),
    }),
    { files: 0, messages: 0, wireframes: 0, prototypes: 0 }
  );

  return {
    projects,
    loading,
    error,
    totalStats,
    createProject,
    deleteProject,
    updateProject,
    refresh: fetchProjects,
  };
}

export function useProject(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch project');
      }

      setProject(data.project);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const updateProject = async (data: Partial<Project>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to update project');
      }

      setProject(result.project);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
      return false;
    }
  };

  return {
    project,
    loading,
    error,
    updateProject,
    refresh: fetchProject,
  };
}
