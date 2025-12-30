'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import react-force-graph to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph').then(mod => mod.ForceGraph2D), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96 text-gray-400">Loading network graph...</div>
});

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

interface NetworkGraphProps {
  nodes: Node[];
  links: Link[];
  height?: number;
  onNodeClick?: (node: Node) => void;
  onNodeHover?: (node: Node | null) => void;
}

export function NetworkGraph({ 
  nodes, 
  links, 
  height = 600,
  onNodeClick,
  onNodeHover
}: NetworkGraphProps) {
  const [isClient, setIsClient] = useState(false);
  const graphRef = useRef<any>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || nodes.length === 0) {
    return (
      <div className="wiki-card p-4 md:p-6">
        <div className="flex items-center justify-center h-96 text-gray-400">
          {nodes.length === 0 ? 'No relationships to display' : 'Loading network graph...'}
        </div>
      </div>
    );
  }

  // Color mapping for relationship types
  const getLinkColor = (link: Link): string => {
    const type = link.type || link.relationship || 'other';
    const colorMap: Record<string, string> = {
      'family': '#8b5cf6',
      'lovers': '#ec4899',
      'crush': '#f472b6',
      'close_friend': '#10b981',
      'friend': '#3b82f6',
      'rival': '#ef4444',
      'hate': '#dc2626',
      'dislike': '#f59e0b',
      'admire': '#14b8a6',
      'neutral': '#6b7280',
      'other': '#9ca3af',
    };
    return colorMap[type] || colorMap['other'];
  };

  // Node color based on group
  const getNodeColor = (node: Node): string => {
    const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#14b8a6'];
    return colors[node.group || 0] || colors[0];
  };

  return (
    <div className="wiki-card p-4 md:p-6">
      <div className="w-full rounded-lg overflow-hidden bg-gray-900" style={{ height: `${height}px` }}>
        <ForceGraph2D
          ref={graphRef}
          graphData={{ nodes, links }}
          nodeLabel={(node: Node) => node.name}
          nodeColor={(node: Node) => getNodeColor(node)}
          nodeVal={(node: Node) => node.size || 5}
          linkColor={(link: Link) => getLinkColor(link)}
          linkWidth={(link: Link) => link.value || 2}
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.25}
          onNodeClick={onNodeClick}
          onNodeHover={onNodeHover}
          backgroundColor="#111827"
          cooldownTicks={100}
          onEngineStop={() => {
            if (graphRef.current) {
              graphRef.current.zoomToFit(400, 20);
            }
          }}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-purple-500"></div>
          <span className="text-gray-300">Family</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-pink-500"></div>
          <span className="text-gray-300">Romantic</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span className="text-gray-300">Friends</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span className="text-gray-300">Rivals/Enemies</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-500"></div>
          <span className="text-gray-300">Other</span>
        </div>
      </div>
    </div>
  );
}

