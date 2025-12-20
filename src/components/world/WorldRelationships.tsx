'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { OC } from '@/types/oc';
import { getRelationshipTypeConfig, RELATIONSHIP_TYPES } from '@/lib/relationships/relationshipTypes';

interface RelationshipEntry {
  name: string;
  relationship?: string;
  description?: string;
  oc_id?: string;
  oc_slug?: string;
  relationship_type?: string;
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
}

interface RelationshipEdge {
  from: string;
  to: string;
  type: string;
  relationship?: string;
  relationship_type?: string;
  color: string;
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

export function WorldRelationships({ ocs }: WorldRelationshipsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

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
    }> = [];

    // Create nodes for all OCs in database
    ocs.forEach((oc) => {
      nodeMap.set(oc.id, {
        id: oc.id,
        name: oc.name,
        slug: oc.slug,
        x: 0,
        y: 0,
        isExternal: false,
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
              });
            }
            
            relationships.push({
              from: oc,
              to: { name: entry.name, oc_id: entry.oc_id, oc_slug: entry.oc_slug },
              type: category,
              relationship: entry.relationship,
              relationship_type: entry.relationship_type,
            });
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
              });
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
            });
          }
        });
      });
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
    
    // Use a fixed coordinate system that fits in viewBox
    const padding = 120;
    const centerX = 400;
    const centerY = 300;
    
    // Position database characters in inner circle
    const innerRadius = Math.min(200, Math.max(120, dbNodes.length * 20));
    dbNodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / Math.max(1, dbNodes.length) - Math.PI / 2; // Start from top
      node.x = centerX + innerRadius * Math.cos(angle);
      node.y = centerY + innerRadius * Math.sin(angle);
    });
    
    // Position external characters in outer circle
    const outerRadius = innerRadius + 150;
    externalNodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / Math.max(1, externalNodes.length) - Math.PI / 2;
      node.x = centerX + outerRadius * Math.cos(angle);
      node.y = centerY + outerRadius * Math.sin(angle);
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

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.5, Math.min(3, prev * delta)));
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  if (ocs.length === 0) {
    return null;
  }

  return (
    <div className="wiki-card p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="wiki-section-header scroll-mt-20">
          <i className="fas fa-heart text-red-400" aria-hidden="true"></i>
          Relationships
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                : 'bg-gray-700/50 text-gray-400 border border-gray-600/50 hover:bg-gray-700/70'
            }`}
          >
            <i className="fas fa-list mr-2"></i>
            List
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'chart'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                : 'bg-gray-700/50 text-gray-400 border border-gray-600/50 hover:bg-gray-700/70'
            }`}
          >
            <i className="fas fa-project-diagram mr-2"></i>
            Chart
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-3">
          {ocs.map((oc) => {
            const ocRelationships = allRelationships.filter((rel) => rel.from.id === oc.id);
            if (ocRelationships.length === 0) return null;

            return (
              <div key={oc.id} className="p-3 bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-lg border border-gray-700/50">
                <h3 className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                  <Link
                    href={`/ocs/${oc.slug}`}
                    className="hover:text-purple-400 transition-colors flex items-center gap-1.5"
                  >
                    <i className="fas fa-user text-purple-400 text-xs"></i>
                    {oc.name}
                  </Link>
                  <span className="text-xs text-gray-500 font-normal">({ocRelationships.length})</span>
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {ocRelationships.map((rel, index) => {
                    const relTypeConfig = getRelationshipTypeConfig(rel.relationship_type);
                    const isExternal = !rel.to.oc_id;
                    return (
                      <div
                        key={index}
                        className="group flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-md border border-gray-700/40 hover:border-gray-600/60 transition-all text-xs"
                        title={rel.relationship || `${rel.to.name} - ${relTypeConfig.label}`}
                      >
                        <i
                          className={`${relTypeConfig.icon} text-xs flex-shrink-0`}
                          style={{ color: relTypeConfig.color }}
                          aria-hidden="true"
                        ></i>
                        {rel.to.oc_slug ? (
                          <Link
                            href={`/ocs/${rel.to.oc_slug}`}
                            className="font-medium text-gray-200 hover:text-purple-400 transition-colors truncate max-w-[120px]"
                          >
                            {rel.to.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-gray-200 truncate max-w-[120px]">
                            {rel.to.name}
                            {isExternal && <span className="text-gray-500 ml-1">(ext)</span>}
                          </span>
                        )}
                        {rel.relationship && (
                          <span className="px-1.5 py-0.5 bg-gray-700/60 text-gray-300 rounded text-[10px] font-medium border border-gray-600/50 truncate max-w-[80px]">
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
        <div className="relative w-full h-[600px] bg-gray-900/50 rounded-lg border border-gray-700/50 overflow-hidden">
          {nodes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <i className="fas fa-info-circle text-2xl mb-2"></i>
                <p>No relationships found between characters.</p>
                <p className="text-sm mt-1">Add relationships in character profiles to see them here.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Controls */}
              <div className="absolute top-4 right-4 z-20 flex gap-2">
                <button
                  onClick={resetView}
                  className="px-3 py-2 bg-gray-800/90 hover:bg-gray-700/90 text-gray-300 rounded-lg border border-gray-600/50 text-sm font-medium transition-colors backdrop-blur-sm"
                  title="Reset view"
                >
                  <i className="fas fa-home"></i>
                </button>
                <button
                  onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                  className="px-3 py-2 bg-gray-800/90 hover:bg-gray-700/90 text-gray-300 rounded-lg border border-gray-600/50 text-sm font-medium transition-colors backdrop-blur-sm"
                  title="Zoom in"
                >
                  <i className="fas fa-plus"></i>
                </button>
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                  className="px-3 py-2 bg-gray-800/90 hover:bg-gray-700/90 text-gray-300 rounded-lg border border-gray-600/50 text-sm font-medium transition-colors backdrop-blur-sm"
                  title="Zoom out"
                >
                  <i className="fas fa-minus"></i>
                </button>
              </div>

              <div className="absolute top-4 left-4 z-20 px-3 py-2 bg-gray-800/90 text-gray-300 rounded-lg border border-gray-600/50 text-xs backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <i className="fas fa-info-circle text-purple-400"></i>
                  <span>Drag to pan, scroll to zoom</span>
                </div>
              </div>

              <div 
                className="absolute inset-0 overflow-hidden"
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
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY > 0 ? 0.9 : 1.1;
                  setZoom((prev) => Math.max(0.5, Math.min(3, prev * delta)));
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

                    return (
                      <line
                        key={`edge-${edge.from}-${edge.to}-${index}`}
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        stroke={lineColor}
                        strokeWidth={4}
                        strokeOpacity={0.8}
                        markerEnd={`url(#${markerId})`}
                        className="transition-all hover:opacity-100 hover:stroke-width-[5]"
                      />
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
                      {/* External indicator icon */}
                      {isExternal && (
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
              <div className="absolute bottom-4 left-4 right-4 p-4 bg-gray-900/95 rounded-lg border border-gray-700/50 backdrop-blur-sm z-10">
                <div className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                  <i className="fas fa-info-circle text-purple-400"></i>
                  Relationship Types
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {RELATIONSHIP_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center gap-2">
                      <i className={`${type.icon} text-sm`} style={{ color: type.color }}></i>
                      <span className="text-xs text-gray-300">{type.label}</span>
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

