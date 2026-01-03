'use client';

import { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

export function useDefaultProject() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDefaultProject() {
      try {
        const response = await fetch('/api/projects/default');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch project');
        }

        setProject(data.project);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchDefaultProject();
  }, []);

  return { project, projectId: project?.id, loading, error };
}
