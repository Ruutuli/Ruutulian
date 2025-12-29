'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { OC } from '@/types/oc';
import { getRelationshipTypeConfig, RELATIONSHIP_TYPES } from '@/lib/relationships/relationshipTypes';
import { convertGoogleDriveUrl } from '@/lib/utils/googleDriveImage';

interface RelationshipEntry {
  name: string;
  relationship?: string;
  description?: string;
  oc_id?: string;
  oc_slug?: string;
  relationship_type?: string;
  image_url?: string;
}

interface WorldRelationshipsProps {
  ocs: OC[];
}

type ViewMode = 'list' | 'chart';

interface RelationshipNode {
  id: string;
  name: string;
  slug?: string;
  x: number;
  y: number;
  isExternal?: boolean; // True if character is not in database
  image_url?: string; // Image URL for the relationship/character
}

interface RelationshipEdge {
  from: string;
  to: string;
  type: string;
  relationship?: string;
  relationship_type?: string;
  color: string;
  isBidirectional?: boolean; // True if both characters have each other in their relationships
}

function parseRelationships(value: string | null | undefined): RelationshipEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item: any) => item && item.name);
    }
  } catch {
    return [];
  }
  return [];
}

// Calculate indirect relationships by finding paths in the relationship graph
// This doesn't parse relationship labels - it just finds connections through the graph
function calculateIndirectRelationships(
  ocs: OC[],
  directRelationships: Array<{
    from: OC;
    to: { name: string; oc_id?: string; oc_slug?: string };
    type: string;
    relationship?: string;
    relationship_type?: string;
    image_url?: string;
  }>,
  nodeMap: Map<string, RelationshipNode>
): Array<{
  from: OC;
  to: { name: string; oc_id?: string; oc_slug?: string };
  type: string;
  relationship?: string;
  relationship_type?: string;
  image_url?: string;
  isIndirect?: boolean;
}> {
  const indirectRelationships: Array<{
    from: OC;
    to: { name: string; oc_id?: string; oc_slug?: string };
    type: string;
    relationship?: string;
    relationship_type?: string;
    image_url?: string;
    isIndirect?: boolean;
  }> = [];

  // Build a graph: map from OC ID to array of connected OC IDs
  const relationshipGraph = new Map<string, Set<string>>();
  const relationshipDetails = new Map<string, {
    from: OC;
    to: { name: string; oc_id?: string; oc_slug?: string };
    type: string;
    relationship?: string;
    relationship_type?: string;
    image_url?: string;
  }>();

  // Initialize graph for all OCs
  ocs.forEach(oc => {
    relationshipGraph.set(oc.id, new Set());
  });

  // Build the graph from direct relationships
  directRelationships.forEach(rel => {
    if (rel.from.id && rel.to.oc_id) {
      // Check if both nodes exist in our graph
      const fromExists = relationshipGraph.has(rel.from.id);
      const toExists = relationshipGraph.has(rel.to.oc_id);
      
      if (fromExists && toExists) {
        // Add edge in both directions (relationships are bidirectional for graph traversal)
        relationshipGraph.get(rel.from.id)!.add(rel.to.oc_id);
        relationshipGraph.get(rel.to.oc_id)!.add(rel.from.id);
        
        // Store relationship details
        const key = `${rel.from.id}-${rel.to.oc_id}`;
        const reverseKey = `${rel.to.oc_id}-${rel.from.id}`;
        relationshipDetails.set(key, rel);
        relationshipDetails.set(reverseKey, rel);
      }
    }
  });

  // Helper to find OC by ID
  const findOC = (id: string): OC | undefined => {
    return ocs.find(oc => oc.id === id);
  };

  // For each OC, find all characters reachable through 2 hops (indirect relationships)
  ocs.forEach(oc => {
    const directConnections = relationshipGraph.get(oc.id) || new Set();
    const visited = new Set<string>([oc.id]);
    const indirectConnections = new Set<string>();

    // For each direct connection, find their connections (2-hop paths)
    directConnections.forEach(intermediateId => {
      visited.add(intermediateId);
      const intermediateConnections = relationshipGraph.get(intermediateId) || new Set();
      
      intermediateConnections.forEach(targetId => {
        // Skip if:
        // - It's the original OC
        // - It's already a direct connection
        // - We've already processed this indirect connection
        if (targetId === oc.id) return;
        if (directConnections.has(targetId)) return;
        if (indirectConnections.has(targetId)) return;
        
        indirectConnections.add(targetId);
      });
    });

    // Create indirect relationships for all found connections
    indirectConnections.forEach(targetId => {
      const targetOC = findOC(targetId);
      if (!targetOC) return;

      // Find the intermediate connection to get relationship details
      let foundIntermediate: string | null = null;
      directConnections.forEach(intermediateId => {
        const intermediateConnections = relationshipGraph.get(intermediateId) || new Set();
        if (intermediateConnections.has(targetId)) {
          foundIntermediate = intermediateId;
        }
      });

      if (foundIntermediate) {
        // Get relationship details from the intermediate connection
        // Check both directions since relationships can be stored either way
        const targetRel = directRelationships.find(
          rel => (rel.from.id === foundIntermediate && rel.to.oc_id === targetId) ||
                 (rel.from.id === targetId && rel.to.oc_id === foundIntermediate)
        );

        if (targetRel) {
          // Get the target OC details
          const targetOC = findOC(targetId);
          if (!targetOC) return;

          // Determine the target name - if the relationship goes from intermediate to target,
          // use targetRel.to.name, otherwise use targetRel.from.name
          let targetName: string;
          if (targetRel.from.id === foundIntermediate && targetRel.to.oc_id === targetId) {
            targetName = targetRel.to.name;
          } else {
            targetName = targetRel.from.name;
          }

          // Use the relationship type from the target relationship
          // or default to 'other' if not available
          const relationshipType = targetRel.relationship_type || 'other';
          const category = targetRel.type || 'other_relationships';

          indirectRelationships.push({
            from: oc,
            to: {
              name: targetName,
              oc_id: targetId,
              oc_slug: targetOC.slug || undefined,
            },
            type: category,
            relationship: undefined, // Don't label indirect relationships
            relationship_type: relationshipType,
            image_url: targetRel.image_url || targetOC.image_url || undefined,
            isIndirect: true,
          });
        }
      }
    });
  });

  return indirectRelationships;
}

export function WorldRelationships({ ocs }: WorldRelationshipsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);

  // Build relationship graph
  const { nodes, edges, allRelationships, viewBox } = useMemo(() => {
    const nodeMap = new Map<string, RelationshipNode>();
    const externalNodeMap = new Map<string, RelationshipNode>(); // For external characters
    const edgeMap = new Map<string, RelationshipEdge>();
    const relationships: Array<{
      from: OC;
      to: { name: string; oc_id?: string; oc_slug?: string };
      type: string;
      relationship?: string;
      relationship_type?: string;
      image_url?: string;
    }> = [];

    // Create nodes for all OCs in database
    // Also track relationship image URLs for each OC
    const ocImageUrls = new Map<string, string>();
    
    ocs.forEach((oc) => {
      nodeMap.set(oc.id, {
        id: oc.id,
        name: oc.name,
        slug: oc.slug,
        x: 0,
        y: 0,
        isExternal: false,
        image_url: oc.image_url || undefined,
      });
    });

    // First pass: collect all relationships to detect mutual ones
    const relationshipPairs = new Map<string, Set<string>>();
    ocs.forEach((oc) => {
      const allRelTypes = [
        { data: oc.family, category: 'family' },
        { data: oc.friends_allies, category: 'friends_allies' },
        { data: oc.rivals_enemies, category: 'rivals_enemies' },
        { data: oc.romantic, category: 'romantic' },
        { data: oc.other_relationships, category: 'other_relationships' },
      ];

      allRelTypes.forEach(({ data, category }) => {
        const entries = parseRelationships(data);
        entries.forEach((entry) => {
          if (entry.oc_id && nodeMap.has(entry.oc_id)) {
            if (!relationshipPairs.has(oc.id)) {
              relationshipPairs.set(oc.id, new Set());
            }
            relationshipPairs.get(oc.id)!.add(entry.oc_id);
          }
        });
      });
    });

    // Parse relationships and create edges/nodes
    ocs.forEach((oc) => {
      const allRelTypes = [
        { data: oc.family, category: 'family' },
        { data: oc.friends_allies, category: 'friends_allies' },
        { data: oc.rivals_enemies, category: 'rivals_enemies' },
        { data: oc.romantic, category: 'romantic' },
        { data: oc.other_relationships, category: 'other_relationships' },
      ];

      allRelTypes.forEach(({ data, category }) => {
        const entries = parseRelationships(data);
        entries.forEach((entry) => {
          if (entry.oc_id && nodeMap.has(entry.oc_id)) {
            // Relationship to character in database
            const edgeKey = `${oc.id}-${entry.oc_id}`;
            const reverseKey = `${entry.oc_id}-${oc.id}`;
            
            // Check if this is a mutual relationship (both characters have each other)
            const isBidirectional = relationshipPairs.get(entry.oc_id)?.has(oc.id) || false;
            
            // Create edge (allow both directions to show bidirectional relationships)
            const relTypeConfig = getRelationshipTypeConfig(entry.relationship_type);
            const existingEdge = edgeMap.get(edgeKey) || edgeMap.get(reverseKey);
            
            if (!existingEdge) {
              edgeMap.set(edgeKey, {
                from: oc.id,
                to: entry.oc_id,
                type: category,
                relationship: entry.relationship,
                relationship_type: entry.relationship_type,
                color: relTypeConfig.color,
                isBidirectional: isBidirectional,
              });
            } else if (isBidirectional && !existingEdge.isBidirectional) {
              // Update existing edge to mark it as bidirectional
              existingEdge.isBidirectional = true;
            }
            
            relationships.push({
              from: oc,
              to: { name: entry.name, oc_id: entry.oc_id, oc_slug: entry.oc_slug },
              type: category,
              relationship: entry.relationship,
              relationship_type: entry.relationship_type,
              image_url: entry.image_url,
            });
            
            // Store relationship image_url for the target OC if available
            if (entry.oc_id && entry.image_url) {
              const targetNode = nodeMap.get(entry.oc_id);
              if (targetNode && !targetNode.image_url) {
                targetNode.image_url = entry.image_url;
              }
            }
          } else {
            // External relationship (not linked to an OC in database)
            // Create a unique ID for external characters based on name
            const externalId = `external-${entry.name.toLowerCase().replace(/\s+/g, '-')}`;
            
            // Create node for external character if it doesn't exist
            if (!externalNodeMap.has(externalId)) {
              externalNodeMap.set(externalId, {
                id: externalId,
                name: entry.name,
                slug: entry.oc_slug,
                x: 0,
                y: 0,
                isExternal: true,
                image_url: entry.image_url || undefined,
              });
            } else {
              // Update image_url if this relationship has one and the node doesn't
              const existingNode = externalNodeMap.get(externalId);
              if (existingNode && entry.image_url && !existingNode.image_url) {
                existingNode.image_url = entry.image_url;
              }
            }
            
            // Create edge to external character
            const edgeKey = `${oc.id}-${externalId}`;
            const relTypeConfig = getRelationshipTypeConfig(entry.relationship_type);
            
            if (!edgeMap.has(edgeKey)) {
              edgeMap.set(edgeKey, {
                from: oc.id,
                to: externalId,
                type: category,
                relationship: entry.relationship,
                relationship_type: entry.relationship_type,
                color: relTypeConfig.color, // Use relationship type color
              });
            }
            
            relationships.push({
              from: oc,
              to: { name: entry.name, oc_id: undefined, oc_slug: entry.oc_slug },
              type: category,
              relationship: entry.relationship,
              relationship_type: entry.relationship_type,
              image_url: entry.image_url,
            });
          }
        });
      });
    });

    // Calculate indirect relationships
    const indirectRelationships = calculateIndirectRelationships(ocs, relationships, nodeMap);
    
    // Add indirect relationships to edges and relationships array
    indirectRelationships.forEach((indirectRel) => {
      if (indirectRel.to.oc_id && nodeMap.has(indirectRel.to.oc_id)) {
        const edgeKey = `${indirectRel.from.id}-${indirectRel.to.oc_id}`;
        const reverseKey = `${indirectRel.to.oc_id}-${indirectRel.from.id}`;
        
        // Check if a direct relationship already exists
        const existingDirectEdge = edgeMap.get(edgeKey) || edgeMap.get(reverseKey);
        
        // Only add indirect edge if there's no direct relationship
        // (we want to show indirect paths, but not duplicate direct ones)
        if (!existingDirectEdge) {
          const relTypeConfig = getRelationshipTypeConfig(indirectRel.relationship_type);
          edgeMap.set(edgeKey, {
            from: indirectRel.from.id,
            to: indirectRel.to.oc_id,
            type: indirectRel.type,
            relationship: indirectRel.relationship,
            relationship_type: indirectRel.relationship_type,
            color: relTypeConfig.color,
          });
        }
        
        // Always add to relationships array for the list view
        relationships.push({
          from: indirectRel.from,
          to: indirectRel.to,
          type: indirectRel.type,
          relationship: indirectRel.relationship,
          relationship_type: indirectRel.relationship_type,
          image_url: indirectRel.image_url,
        });
      }
    });

    // Combine database and external nodes
    const allNodes = [...Array.from(nodeMap.values()), ...Array.from(externalNodeMap.values())];
    
    if (allNodes.length === 0) {
      return {
        nodes: [],
        edges: [],
        allRelationships: relationships,
        viewBox: '0 0 800 600',
      };
    }

    // Separate database and external nodes for layout
    const dbNodes = Array.from(nodeMap.values());
    const externalNodes = Array.from(externalNodeMap.values());
    
    // Build adjacency list for force-directed layout using edgeMap
    const adjacencyList = new Map<string, Set<string>>();
    allNodes.forEach(node => {
      adjacencyList.set(node.id, new Set());
    });
    
    // Use edgeMap to build adjacency list
    edgeMap.forEach(edge => {
      adjacencyList.get(edge.from)?.add(edge.to);
      adjacencyList.get(edge.to)?.add(edge.from);
    });
    
    // Force-directed layout parameters
    const padding = 120;
    const centerX = 400;
    const centerY = 300;
    const layoutWidth = 800;
    const layoutHeight = 600;
    const k = Math.sqrt((layoutWidth * layoutHeight) / allNodes.length); // Optimal distance between nodes
    const iterations = 100;
    const alpha = 1.0; // Initial temperature
    const alphaDecay = 0.02;
    
    // Initialize positions in a circle
    const initialRadius = Math.min(150, Math.max(80, allNodes.length * 15));
    allNodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / Math.max(1, allNodes.length) - Math.PI / 2;
      node.x = centerX + initialRadius * Math.cos(angle);
      node.y = centerY + initialRadius * Math.sin(angle);
    });
    
    // Force-directed layout simulation
    let currentAlpha = alpha;
    for (let iteration = 0; iteration < iterations; iteration++) {
      // Repulsion forces (push all nodes apart)
      const forces = new Map<string, { x: number; y: number }>();
      allNodes.forEach(node => {
        forces.set(node.id, { x: 0, y: 0 });
      });
      
      // Calculate repulsion between all pairs of nodes
      for (let i = 0; i < allNodes.length; i++) {
        for (let j = i + 1; j < allNodes.length; j++) {
          const nodeA = allNodes[i];
          const nodeB = allNodes[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (k * k) / distance;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          const forceA = forces.get(nodeA.id)!;
          const forceB = forces.get(nodeB.id)!;
          forceA.x -= fx;
          forceA.y -= fy;
          forceB.x += fx;
          forceB.y += fy;
        }
      }
      
      // Attraction forces (pull connected nodes together)
      edgeMap.forEach(edge => {
        const nodeA = allNodes.find(n => n.id === edge.from);
        const nodeB = allNodes.find(n => n.id === edge.to);
        if (!nodeA || !nodeB) return;
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (distance * distance) / k;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        const forceA = forces.get(nodeA.id)!;
        const forceB = forces.get(nodeB.id)!;
        forceA.x += fx;
        forceA.y += fy;
        forceB.x -= fx;
        forceB.y -= fy;
      });
      
      // Apply forces with cooling
      allNodes.forEach(node => {
        const force = forces.get(node.id)!;
        const magnitude = Math.sqrt(force.x * force.x + force.y * force.y);
        if (magnitude > 0) {
          const limitedForce = Math.min(magnitude, currentAlpha * 10);
          node.x += (force.x / magnitude) * limitedForce;
          node.y += (force.y / magnitude) * limitedForce;
        }
        
        // Keep nodes within bounds
        const margin = 50;
        node.x = Math.max(margin, Math.min(layoutWidth - margin, node.x));
        node.y = Math.max(margin, Math.min(layoutHeight - margin, node.y));
      });
      
      currentAlpha *= (1 - alphaDecay);
    }
    
    // Center the layout
    const avgX = allNodes.reduce((sum, n) => sum + n.x, 0) / allNodes.length;
    const avgY = allNodes.reduce((sum, n) => sum + n.y, 0) / allNodes.length;
    const offsetX = centerX - avgX;
    const offsetY = centerY - avgY;
    allNodes.forEach(node => {
      node.x += offsetX;
      node.y += offsetY;
    });

    // Calculate bounding box for viewBox
    const minX = Math.min(...allNodes.map(n => n.x)) - padding;
    const minY = Math.min(...allNodes.map(n => n.y)) - padding;
    const maxX = Math.max(...allNodes.map(n => n.x)) + padding;
    const maxY = Math.max(...allNodes.map(n => n.y)) + padding;
    const width = maxX - minX;
    const height = maxY - minY;

    return {
      nodes: allNodes,
      edges: Array.from(edgeMap.values()),
      allRelationships: relationships,
      viewBox: `${minX} ${minY} ${width} ${height}`,
    };
  }, [ocs]);

  // Pan and zoom handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Set up wheel listener for zoom when in chart mode
  useEffect(() => {
    const container = chartContainerRef.current;
    
    // Only set up listener when in chart view mode
    if (viewMode !== 'chart') {
      // Clean up if switching away from chart mode
      if (wheelHandlerRef.current && container) {
        container.removeEventListener('wheel', wheelHandlerRef.current);
        wheelHandlerRef.current = null;
      }
      return;
    }
    
    // Wait for container to be available
    if (!container) {
      // Use requestAnimationFrame to check again after render
      const rafId = requestAnimationFrame(() => {
        const retryContainer = chartContainerRef.current;
        if (retryContainer && viewMode === 'chart' && !wheelHandlerRef.current) {
          const handleWheelNative = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom((prev) => Math.max(0.5, Math.min(3, prev * delta)));
          };
          wheelHandlerRef.current = handleWheelNative;
          retryContainer.addEventListener('wheel', handleWheelNative, { passive: false });
        }
      });
      return () => cancelAnimationFrame(rafId);
    }
    
    // Clean up existing listener if any
    if (wheelHandlerRef.current) {
      container.removeEventListener('wheel', wheelHandlerRef.current);
      wheelHandlerRef.current = null;
    }
    
    // Set up new listener
    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((prev) => Math.max(0.5, Math.min(3, prev * delta)));
    };
    
    wheelHandlerRef.current = handleWheelNative;
    container.addEventListener('wheel', handleWheelNative, { passive: false });
    
    return () => {
      if (container && wheelHandlerRef.current) {
        container.removeEventListener('wheel', wheelHandlerRef.current);
        wheelHandlerRef.current = null;
      }
    };
  }, [viewMode]);

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  if (ocs.length === 0) {
    return null;
  }

  return (
    <div className="wiki-card p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="wiki-section-header scroll-mt-20">
          <i className="fas fa-heart text-red-400" aria-hidden="true"></i>
          Relationships
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 md:px-4 rounded-lg text-xs md:text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                : 'bg-gray-700/50 text-gray-400 border border-gray-600/50 hover:bg-gray-700/70'
            }`}
          >
            <i className="fas fa-list mr-1.5 md:mr-2"></i>
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`px-3 py-2 md:px-4 rounded-lg text-xs md:text-sm font-medium transition-colors ${
              viewMode === 'chart'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                : 'bg-gray-700/50 text-gray-400 border border-gray-600/50 hover:bg-gray-700/70'
            }`}
          >
            <i className="fas fa-project-diagram mr-1.5 md:mr-2"></i>
            <span className="hidden sm:inline">Chart</span>
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-3 md:space-y-4">
          {ocs.map((oc) => {
            const ocRelationships = allRelationships.filter((rel) => rel.from.id === oc.id);
            if (ocRelationships.length === 0) return null;

            return (
              <div key={oc.id} className="p-3 md:p-4 bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-lg border border-gray-700/50">
                <h3 className="text-sm md:text-base font-semibold text-gray-200 mb-3 flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/ocs/${oc.slug}`}
                    className="hover:text-purple-400 transition-colors flex items-center gap-1.5 md:gap-2"
                  >
                    {oc.image_url && (
                      <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-gray-600/50">
                        <Image
                          src={convertGoogleDriveUrl(oc.image_url)}
                          alt={oc.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    {!oc.image_url && (
                      <i className="fas fa-user text-purple-400 text-xs md:text-sm"></i>
                    )}
                    <span className="break-words">{oc.name}</span>
                  </Link>
                  <span className="text-xs text-gray-500 font-normal">({ocRelationships.length})</span>
                </h3>
                <div className="flex flex-wrap gap-2 md:gap-1.5">
                  {ocRelationships.map((rel, index) => {
                    const relTypeConfig = getRelationshipTypeConfig(rel.relationship_type);
                    const isExternal = !rel.to.oc_id;
                    return (
                      <div
                        key={index}
                        className="group flex items-center gap-1.5 md:gap-1.5 px-2.5 py-1.5 md:px-2.5 md:py-1.5 bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-md border border-gray-700/40 hover:border-gray-600/60 transition-all text-xs w-full sm:w-auto sm:max-w-none"
                        title={rel.relationship || `${rel.to.name} - ${relTypeConfig.label}`}
                      >
                        {rel.image_url && (
                          <div className="flex-shrink-0 w-6 h-6 md:w-6 md:h-6 rounded-full overflow-hidden border border-gray-600/50">
                            <Image
                              src={convertGoogleDriveUrl(rel.image_url)}
                              alt={rel.to.name}
                              width={24}
                              height={24}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                        <i
                          className={`${relTypeConfig.icon} text-xs flex-shrink-0`}
                          style={{ color: relTypeConfig.color }}
                          aria-hidden="true"
                        ></i>
                        {rel.to.oc_slug ? (
                          <Link
                            href={`/ocs/${rel.to.oc_slug}`}
                            className="font-medium text-gray-200 hover:text-purple-400 transition-colors truncate flex-1 sm:flex-none sm:max-w-[120px]"
                          >
                            {rel.to.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-gray-200 truncate flex-1 sm:flex-none sm:max-w-[120px]">
                            {rel.to.name}
                            {isExternal && <span className="text-gray-500 ml-1">(ext)</span>}
                          </span>
                        )}
                        {rel.relationship && (
                          <span className="px-1.5 py-0.5 bg-gray-700/60 text-gray-300 rounded text-[10px] font-medium border border-gray-600/50 truncate max-w-[100px] sm:max-w-[80px]">
                            {rel.relationship}
                          </span>
                        )}
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0"
                          style={{
                            backgroundColor: relTypeConfig.bgColor,
                            color: relTypeConfig.color,
                            borderColor: relTypeConfig.borderColor,
                          }}
                        >
                          {relTypeConfig.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="relative w-full h-[400px] sm:h-[500px] md:h-[600px] bg-gray-900/50 rounded-lg border border-gray-700/50 overflow-hidden">
          {nodes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 px-4">
              <div className="text-center">
                <i className="fas fa-info-circle text-2xl mb-2"></i>
                <p className="text-sm md:text-base">No relationships found between characters.</p>
                <p className="text-xs md:text-sm mt-1">Add relationships in character profiles to see them here.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Controls */}
              <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 flex gap-1.5 sm:gap-2">
                <button
                  onClick={resetView}
                  className="px-2.5 py-2 sm:px-3 sm:py-2 bg-gray-800/90 hover:bg-gray-700/90 text-gray-300 rounded-lg border border-gray-600/50 text-xs sm:text-sm font-medium transition-colors backdrop-blur-sm touch-manipulation"
                  title="Reset view"
                  aria-label="Reset view"
                >
                  <i className="fas fa-home"></i>
                </button>
                <button
                  onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                  className="px-2.5 py-2 sm:px-3 sm:py-2 bg-gray-800/90 hover:bg-gray-700/90 text-gray-300 rounded-lg border border-gray-600/50 text-xs sm:text-sm font-medium transition-colors backdrop-blur-sm touch-manipulation"
                  title="Zoom in"
                  aria-label="Zoom in"
                >
                  <i className="fas fa-plus"></i>
                </button>
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                  className="px-2.5 py-2 sm:px-3 sm:py-2 bg-gray-800/90 hover:bg-gray-700/90 text-gray-300 rounded-lg border border-gray-600/50 text-xs sm:text-sm font-medium transition-colors backdrop-blur-sm touch-manipulation"
                  title="Zoom out"
                  aria-label="Zoom out"
                >
                  <i className="fas fa-minus"></i>
                </button>
              </div>

              <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-20 px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-800/90 text-gray-300 rounded-lg border border-gray-600/50 text-[10px] sm:text-xs backdrop-blur-sm max-w-[calc(100%-120px)] sm:max-w-none">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <i className="fas fa-info-circle text-purple-400 text-xs sm:text-sm"></i>
                  <span className="hidden sm:inline">Drag to pan, scroll to zoom</span>
                  <span className="sm:hidden">Pinch to zoom</span>
                </div>
              </div>

              <div 
                ref={chartContainerRef}
                className="absolute inset-0 overflow-hidden touch-none"
                onMouseDown={(e) => {
                  if (e.button === 0) {
                    setIsDragging(true);
                    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
                  }
                }}
                onMouseMove={(e) => {
                  if (isDragging) {
                    setPan({
                      x: e.clientX - dragStart.x,
                      y: e.clientY - dragStart.y,
                    });
                  }
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    const touch = e.touches[0];
                    setIsDragging(true);
                    setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
                    setLastPinchDistance(null);
                  } else if (e.touches.length === 2) {
                    setIsDragging(false);
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    const distance = Math.hypot(
                      touch2.clientX - touch1.clientX,
                      touch2.clientY - touch1.clientY
                    );
                    setLastPinchDistance(distance);
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length === 2) {
                    e.preventDefault();
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    const distance = Math.hypot(
                      touch2.clientX - touch1.clientX,
                      touch2.clientY - touch1.clientY
                    );
                    
                    if (lastPinchDistance !== null) {
                      const scale = distance / lastPinchDistance;
                      setZoom((prev) => Math.max(0.5, Math.min(3, prev * scale)));
                    }
                    setLastPinchDistance(distance);
                  } else if (isDragging && e.touches.length === 1) {
                    const touch = e.touches[0];
                    setPan({
                      x: touch.clientX - dragStart.x,
                      y: touch.clientY - dragStart.y,
                    });
                  }
                }}
                onTouchEnd={() => {
                  setIsDragging(false);
                  setLastPinchDistance(null);
                }}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              >
                <svg 
                  ref={svgRef}
                  width="100%" 
                  height="100%" 
                  viewBox={viewBox}
                  preserveAspectRatio="xMidYMid meet"
                  className="absolute inset-0"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                  }}
                >
                <defs>
                  {/* Arrow markers for each relationship type color */}
                  {RELATIONSHIP_TYPES.map((type) => (
                    <marker
                      key={type.value}
                      id={`arrowhead-${type.value}`}
                      markerWidth="10"
                      markerHeight="10"
                      refX="9"
                      refY="3"
                      orient="auto"
                      markerUnits="strokeWidth"
                    >
                      <polygon 
                        points="0 0, 10 3, 0 6" 
                        fill={type.color}
                        opacity="0.7"
                      />
                    </marker>
                  ))}
                  {/* Default arrow marker */}
                  <marker
                    id="arrowhead-default"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <polygon 
                      points="0 0, 10 3, 0 6" 
                      fill="#9E9E9E"
                      opacity="0.7"
                    />
                  </marker>
                </defs>

                {/* Render edges first (so they appear behind nodes) */}
                {edges.length > 0 ? (
                  edges.map((edge, index) => {
                    const fromNode = nodes.find((n) => n.id === edge.from);
                    const toNode = nodes.find((n) => n.id === edge.to);
                    if (!fromNode || !toNode) {
                      return null;
                    }

                    // Get relationship type config for proper color and marker
                    const relTypeConfig = getRelationshipTypeConfig(edge.relationship_type);
                    const markerId = `arrowhead-${relTypeConfig.value}`;
                    // Use the relationship type color, fallback to edge.color if needed
                    const lineColor = relTypeConfig.color || edge.color;

                    // For bidirectional relationships, don't show arrow (or show on both ends)
                    const isBidirectional = edge.isBidirectional || false;

                    // Calculate curve control point to make edges more distinct
                    // Use a quadratic bezier curve with control point offset from center
                    const midX = (fromNode.x + toNode.x) / 2;
                    const midY = (fromNode.y + toNode.y) / 2;
                    const dx = toNode.x - fromNode.x;
                    const dy = toNode.y - fromNode.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    // Perpendicular offset
                    const offsetX = -dy / distance * 30;
                    const offsetY = dx / distance * 30;
                    const controlX = midX + offsetX;
                    const controlY = midY + offsetY;

                    // Create curved path for better visual distinction
                    const pathId = `edge-path-${edge.from}-${edge.to}-${index}`;
                    const pathData = `M ${fromNode.x} ${fromNode.y} Q ${controlX} ${controlY} ${toNode.x} ${toNode.y}`;

                    return (
                      <g key={`edge-${edge.from}-${edge.to}-${index}`} className="edge-group">
                        {/* Invisible wider path for easier hovering */}
                        <path
                          d={pathData}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={20}
                          className="cursor-pointer"
                          style={{ pointerEvents: 'stroke' }}
                        />
                        {/* Visible curved edge */}
                        <path
                          id={pathId}
                          d={pathData}
                          fill="none"
                          stroke={lineColor}
                          strokeWidth={4}
                          strokeOpacity={0.8}
                          markerEnd={isBidirectional ? undefined : `url(#${markerId})`}
                          className="transition-all hover:opacity-100 hover:stroke-width-[6]"
                          style={{ 
                            filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.3))',
                          }}
                        />
                        {/* Tooltip on hover */}
                        <title>
                          {fromNode.name} → {toNode.name}
                          {edge.relationship && ` (${edge.relationship})`}
                        </title>
                      </g>
                    );
                  })
                ) : (
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    fill="#9CA3AF"
                    fontSize="16"
                    className="pointer-events-none"
                  >
                    No relationships found between characters
                  </text>
                )}

                {/* Render nodes */}
                {nodes.map((node) => {
                  const oc = ocs.find((o) => o.id === node.id);
                  const nodeRelationships = edges.filter(e => e.from === node.id || e.to === node.id);
                  const isExternal = node.isExternal || false;
                  
                  return (
                    <g key={node.id} className="cursor-pointer group">
                      {/* Node circle - different style for external characters */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isExternal ? 22 : 25}
                        fill={isExternal ? "#374151" : "#4B5563"}
                        stroke={isExternal ? "#9CA3AF" : "#6B7280"}
                        strokeWidth={isExternal ? 2 : 3}
                        strokeDasharray={isExternal ? "5,5" : "none"}
                        className="transition-all group-hover:fill-gray-600 group-hover:stroke-purple-400"
                        style={isExternal ? { 
                          transform: `scale(${node.x === 0 && node.y === 0 ? 0 : 1})`,
                        } : {}}
                      />
                      {/* Relationship image - circular clip inside the node */}
                      {node.image_url && (
                        <>
                          <defs>
                            <clipPath id={`image-clip-${node.id}`}>
                              <circle
                                cx={node.x}
                                cy={node.y}
                                r={isExternal ? 18 : 21}
                              />
                            </clipPath>
                          </defs>
                          <image
                            href={convertGoogleDriveUrl(node.image_url)}
                            x={node.x - (isExternal ? 18 : 21)}
                            y={node.y - (isExternal ? 18 : 21)}
                            width={(isExternal ? 18 : 21) * 2}
                            height={(isExternal ? 18 : 21) * 2}
                            clipPath={`url(#image-clip-${node.id})`}
                            className="pointer-events-none"
                            preserveAspectRatio="xMidYMid slice"
                          />
                        </>
                      )}
                      {/* External indicator icon - only show if no image */}
                      {isExternal && !node.image_url && (
                        <text
                          x={node.x}
                          y={node.y + 5}
                          textAnchor="middle"
                          fill="#9CA3AF"
                          fontSize="10"
                          className="pointer-events-none select-none"
                        >
                          ⚬
                        </text>
                      )}
                      {/* Node label background */}
                      <rect
                        x={node.x - 45}
                        y={node.y + 30}
                        width={90}
                        height={20}
                        fill={isExternal ? "#1F2937" : "#1F2937"}
                        fillOpacity={0.9}
                        rx={4}
                        className="transition-opacity group-hover:fill-opacity-100"
                      />
                      {/* Node label */}
                      <text
                        x={node.x}
                        y={node.y + 43}
                        textAnchor="middle"
                        fill={isExternal ? "#D1D5DB" : "#E5E7EB"}
                        fontSize="11"
                        fontWeight={isExternal ? "400" : "500"}
                        fontStyle={isExternal ? "italic" : "normal"}
                        className="pointer-events-none select-none"
                      >
                        {node.name.length > 14 ? node.name.substring(0, 14) + '...' : node.name}
                      </text>
                      {/* External indicator text */}
                      {isExternal && (
                        <text
                          x={node.x}
                          y={node.y + 55}
                          textAnchor="middle"
                          fill="#9CA3AF"
                          fontSize="8"
                          className="pointer-events-none select-none"
                        >
                          (external)
                        </text>
                      )}
                      {/* Relationship count badge */}
                      {nodeRelationships.length > 0 && (
                        <circle
                          cx={node.x + 20}
                          cy={node.y - 20}
                          r={12}
                          fill={isExternal ? "#6B7280" : "#7C3AED"}
                          stroke="#1F2937"
                          strokeWidth={2}
                        />
                      )}
                      {nodeRelationships.length > 0 && (
                        <text
                          x={node.x + 20}
                          y={node.y - 16}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="10"
                          fontWeight="bold"
                          className="pointer-events-none select-none"
                        >
                          {nodeRelationships.length}
                        </text>
                      )}
                    </g>
                  );
                })}
                </svg>
              </div>
              
              {/* Legend */}
              <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 p-2 sm:p-3 md:p-4 bg-gray-900/95 rounded-lg border border-gray-700/50 backdrop-blur-sm z-10 max-h-[40%] overflow-y-auto">
                <div className="text-xs sm:text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                  <i className="fas fa-info-circle text-purple-400 text-xs sm:text-sm"></i>
                  <span>Relationship Types</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2">
                  {RELATIONSHIP_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center gap-1.5 sm:gap-2">
                      <i className={`${type.icon} text-xs sm:text-sm flex-shrink-0`} style={{ color: type.color }}></i>
                      <span className="text-[10px] sm:text-xs text-gray-300 truncate">{type.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

