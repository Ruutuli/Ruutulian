'use client';

import { useState, useEffect } from 'react';
import { NetworkGraph } from '@/components/visualizations/NetworkGraph';
import { PageHeader } from '@/components/layout/PageHeader';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Node {
  id: string;
  name: string;
  group?: number;
  image_url?: string;
  size?: number;
}

interface Link {
  source: string | Node;
  target: string | Node;
  relationship?: string;
  type?: string;
  value?: number;
}

export default function RelationshipGraphPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchGraphData() {
      try {
        const response = await fetch('/api/relationships/graph');
        if (!response.ok) {
          throw new Error('Failed to fetch relationship data');
        }
        const data = await response.json();
        setNodes(data.nodes || []);
        setLinks(data.links || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchGraphData();
  }, []);

  const handleNodeClick = (node: Node) => {
    router.push(`/ocs/${node.id}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Relationship Network" />
        <div className="wiki-card p-6 text-center text-gray-400">
          <p>Loading relationship network...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Relationship Network" />
        <div className="wiki-card p-6 text-center text-red-400">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Relationship Network" />
      <div className="wiki-card p-4 md:p-6">
        <p className="text-gray-400 mb-4">
          Interactive visualization of character relationships. Click on nodes to view character profiles.
        </p>
      </div>
      <NetworkGraph
        nodes={nodes}
        links={links}
        onNodeClick={handleNodeClick}
        height={700}
      />
    </div>
  );
}

