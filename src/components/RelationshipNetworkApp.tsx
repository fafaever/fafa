import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, Plus, Minus, RotateCcw, Edit2, Check, X, Users, HelpCircle, User, ArrowRight } from "lucide-react";
import { Character, BoundNPC, AppSettings } from "../types";

interface RelationshipNetworkAppProps {
  characters: Character[];
  onClose: () => void;
  onUpdateCharacter: (id: string, updated: Partial<Character>) => void;
  settings?: AppSettings;
}

export default function RelationshipNetworkApp({
  characters,
  onClose,
  onUpdateCharacter,
  settings,
}: RelationshipNetworkAppProps) {
  // Center Character Selection State
  const [centerCharId, setCenterCharId] = useState<string>("");

  // UI state for editing relation
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // Zoom and Pan states
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Tooltip / Detail panel state
  const [hoveredNode, setHoveredNode] = useState<{
    id: string;
    name: string;
    type: "center" | "character" | "npc" | "user";
    avatar: string;
    desc: string;
  } | null>(null);

  // Default to the first character on mount
  useEffect(() => {
    if (characters.length > 0 && !centerCharId) {
      setCenterCharId(characters[0].id);
    }
  }, [characters, centerCharId]);

  const centerChar = characters.find((c) => c.id === centerCharId);

  // SVG dimensions
  const svgWidth = 400;
  const svgHeight = 360;

  // Build surrounding nodes lists
  const getNodesAndLinks = () => {
    if (!centerChar) return { nodes: [], links: [] };

    const nodes: any[] = [];
    const links: any[] = [];

    // Center Node (placed at 0, 0 in relative space)
    nodes.push({
      id: centerChar.id,
      name: centerChar.name,
      avatar: centerChar.avatar || "🤖",
      type: "center",
      realId: centerChar.id,
      desc: centerChar.description || "中心角色",
      x: 0,
      y: 0,
    });

    // Angle calculations for surroundings
    const surroundingItems: {
      id: string;
      name: string;
      avatar: string;
      type: "character" | "npc" | "user";
      realId?: string;
      desc: string;
      relation: string;
    }[] = [];

    // 1. Associated Characters
    if (centerChar.associatedCharacterIds) {
      centerChar.associatedCharacterIds.forEach((id) => {
        const other = characters.find((c) => c.id === id);
        if (other) {
          const relation = centerChar.associatedRelations?.[id] || "关联关系";
          surroundingItems.push({
            id: `char-${id}`,
            name: other.name,
            avatar: other.avatar || "🤖",
            type: "character",
            realId: other.id,
            desc: other.description || "另一个 AI 角色",
            relation,
          });
        }
      });
    }

    // 2. Bound NPCs
    if (centerChar.boundNpcs) {
      centerChar.boundNpcs.forEach((npc) => {
        surroundingItems.push({
          id: `npc-${npc.id}`,
          name: npc.name,
          avatar: npc.avatar || "👥",
          type: "npc",
          desc: npc.description || "角色的专属 NPC 伙伴",
          relation: npc.relationship || "绑定伙伴",
        });
      });
    }

    // 3. Bound User Persona or Default User
    let userPersonaName = "用户";
    let userPersonaDesc = "您自己（扮演的主角）";
    if (centerChar.userPersonaId) {
      try {
        const personasRaw = localStorage.getItem("mobile_ai_user_personas");
        if (personasRaw) {
          const personas = JSON.parse(personasRaw);
          const found = personas.find((p: any) => p.id === centerChar.userPersonaId);
          if (found) {
            userPersonaName = found.name;
            userPersonaDesc = found.description || "绑定的专属用户人设";
          }
        }
      } catch (e) {}
    }
    const userRelation = centerChar.associatedRelations?.["user"] || "倾听者";
    surroundingItems.push({
      id: "node-user",
      name: userPersonaName,
      avatar: "👤",
      type: "user",
      desc: userPersonaDesc,
      relation: userRelation,
    });

    // Project surrounding items on a circle
    const count = surroundingItems.length;
    const radius = 135; // circular distance

    surroundingItems.forEach((item, index) => {
      // Offset start angle so it looks visually balanced
      const angle = (index * 2 * Math.PI) / count - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      nodes.push({
        ...item,
        x,
        y,
      });

      links.push({
        sourceId: centerChar.id,
        targetId: item.id,
        relation: item.relation,
        targetX: x,
        targetY: y,
        targetType: item.type,
        targetRealId: item.realId,
      });
    });

    return { nodes, links };
  };

  const { nodes, links } = getNodesAndLinks();

  // Handle Drag / Pan events on background
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).tagName === "button" || (e.target as HTMLElement).closest("button")) {
      return;
    }
    setIsDragging(true);
    dragStart.current = { x: e.clientX - panX, y: e.clientY - panY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.current.x);
    setPanY(e.clientY - dragStart.current.y);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // Zoom controls helpers
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.15, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.4));
  const handleReset = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  // Switch center node immediately
  const handleNodeClick = (node: any) => {
    if (node.type === "character" && node.realId) {
      setCenterCharId(node.realId);
      setEditingTargetId(null);
    }
  };

  // Start inline edit relation text
  const handleStartEditRelation = (targetId: string, currentText: string) => {
    setEditingTargetId(targetId);
    setEditingValue(currentText);
  };

  // Save modified relation
  const handleSaveRelation = (targetId: string) => {
    if (!centerChar) return;

    let updatedRelations = { ...(centerChar.associatedRelations || {}) };
    let updatedNpcs = centerChar.boundNpcs ? [...centerChar.boundNpcs] : [];

    if (targetId.startsWith("char-")) {
      const actualCharId = targetId.replace("char-", "");
      updatedRelations[actualCharId] = editingValue;
    } else if (targetId === "node-user") {
      updatedRelations["user"] = editingValue;
    } else if (targetId.startsWith("npc-")) {
      const npcId = targetId.replace("npc-", "");
      updatedNpcs = updatedNpcs.map((npc) => {
        if (npc.id === npcId) {
          return { ...npc, relationship: editingValue };
        }
        return npc;
      });
    }

    onUpdateCharacter(centerChar.id, {
      associatedRelations: updatedRelations,
      boundNpcs: updatedNpcs,
    });

    setEditingTargetId(null);
  };

  // Check if center character has any relations
  const hasAnyRelations = centerChar && (
    (centerChar.associatedCharacterIds && centerChar.associatedCharacterIds.length > 0) ||
    (centerChar.boundNpcs && centerChar.boundNpcs.length > 0)
  );

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden text-neutral-800" id="relationship-network-app">
      {/* App Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-100 shrink-0 bg-white">
        <button
          onClick={onClose}
          className="p-1 -ml-1 rounded-full hover:bg-neutral-100 transition-colors"
          id="btn-network-close"
        >
          <ChevronLeft className="w-5 h-5 text-neutral-600" />
        </button>
        <span className="text-sm font-bold font-serif tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
          关系网 (Relationship Network)
        </span>
        <div className="w-5" />
      </div>

      {/* Top Controller Panel */}
      <div className="px-4 py-3 bg-neutral-50/80 border-b border-neutral-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-neutral-500 uppercase whitespace-nowrap">中心人物:</label>
          <select
            value={centerCharId}
            onChange={(e) => {
              setCenterCharId(e.target.value);
              setEditingTargetId(null);
            }}
            className="text-xs border border-neutral-200 focus:border-black px-2 py-1.5 rounded-lg bg-white text-neutral-800 outline-none w-full sm:w-48 font-medium shadow-sm"
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.avatar || "🤖"} {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Zoom Controls */}
        <div className="flex items-center justify-end gap-1.5 self-end sm:self-auto">
          <button
            onClick={handleZoomOut}
            title="缩小"
            className="p-1.5 bg-white border border-neutral-200 hover:border-black rounded-lg text-neutral-500 hover:text-black transition-colors shadow-sm"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono font-bold text-neutral-400 px-1 select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            title="放大"
            className="p-1.5 bg-white border border-neutral-200 hover:border-black rounded-lg text-neutral-500 hover:text-black transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            title="重置视图"
            className="p-1.5 bg-white border border-neutral-200 hover:border-black rounded-lg text-neutral-500 hover:text-black transition-colors shadow-sm ml-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area split into Viewport and Sidebar details */}
      <div className="flex-1 flex flex-col min-h-0">
        
        {/* SVG Node Canvas Viewport */}
        <div 
          className="flex-1 relative bg-neutral-100/30 overflow-hidden cursor-grab active:cursor-grabbing border-b border-neutral-100 select-none min-h-[300px]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          id="network-canvas-container"
        >
          {/* Background grid lines for high-quality tactical feel */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }} />

          {centerChar ? (
            <svg 
              className="w-full h-full"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              id="network-svg"
            >
              {/* Zoom and Pan coordinate translation block */}
              <g transform={`translate(${svgWidth / 2 + panX}, ${svgHeight / 2 + panY}) scale(${zoom})`}>
                
                {/* 1. Draw Links First so they sit under nodes */}
                {links.map((link, idx) => {
                  const isHovered = hoveredNode?.id === link.targetId;
                  const isEditingThis = editingTargetId === link.targetId;

                  return (
                    <g key={`link-${idx}`} className="transition-all duration-300">
                      {/* Connection Line */}
                      <line
                        x1={0}
                        y1={0}
                        x2={link.targetX}
                        y2={link.targetY}
                        stroke={isHovered ? "#000" : "#d4d4d4"}
                        strokeWidth={isHovered ? 2.5 : 1.25}
                        strokeDasharray={link.targetType === "npc" ? "4 4" : "none"}
                        className="transition-colors duration-200"
                      />

                      {/* Connection Relationship Label Badge (clickable to edit) */}
                      {!isEditingThis ? (
                        <g 
                          transform={`translate(${link.targetX / 2}, ${link.targetY / 2})`}
                          className="cursor-pointer"
                          onClick={() => handleStartEditRelation(link.targetId, link.relation)}
                        >
                          <rect
                            x={-35}
                            y={-9}
                            width={70}
                            height={18}
                            rx={6}
                            fill="#ffffff"
                            stroke={isHovered ? "#000000" : "#e5e5e5"}
                            strokeWidth={1}
                            className="shadow-sm transition-colors duration-200"
                          />
                          <text
                            textAnchor="middle"
                            y={3}
                            fontSize={8}
                            fontWeight="bold"
                            className="fill-neutral-700 pointer-events-none select-none font-sans"
                          >
                            {link.relation.length > 7 ? link.relation.substring(0, 6) + "..." : link.relation}
                          </text>
                        </g>
                      ) : (
                        // Tiny inline input container shown exactly on the midpoint!
                        <foreignObject
                          x={link.targetX / 2 - 50}
                          y={link.targetY / 2 - 14}
                          width={100}
                          height={28}
                        >
                          <div className="flex gap-1 items-center bg-white border border-black rounded-lg p-0.5 shadow-md">
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="w-full text-[9px] px-1 outline-none font-bold"
                              placeholder="关系..."
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveRelation(link.targetId)}
                              className="p-0.5 bg-black text-white rounded hover:bg-neutral-800 shrink-0"
                            >
                              <Check className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={() => setEditingTargetId(null)}
                              className="p-0.5 bg-neutral-100 text-neutral-500 rounded hover:bg-neutral-200 shrink-0"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </foreignObject>
                      )}
                    </g>
                  );
                })}

                {/* 2. Draw Nodes */}
                {nodes.map((node) => {
                  const isCenter = node.type === "center";
                  const isHovered = hoveredNode?.id === node.id;
                  const canNavigate = node.type === "character";

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      className={`transition-all duration-300 ${canNavigate ? "cursor-pointer" : "cursor-default"}`}
                      onClick={() => handleNodeClick(node)}
                      onMouseEnter={() =>
                        setHoveredNode({
                          id: node.id,
                          name: node.name,
                          type: node.type,
                          avatar: node.avatar,
                          desc: node.desc,
                        })
                      }
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      {/* Node Circle Border Ring */}
                      <circle
                        r={isCenter ? 26 : 21}
                        fill={isCenter ? "#000000" : "#ffffff"}
                        stroke={isCenter ? "#000000" : isHovered ? "#000000" : "#e5e5e5"}
                        strokeWidth={isCenter ? 2 : 1.5}
                        strokeDasharray={node.type === "npc" ? "3 3" : "none"}
                        className="transition-colors duration-200 shadow-md"
                      />

                      {/* Double ring effect for user */}
                      {node.type === "user" && (
                        <circle
                          r={18}
                          fill="none"
                          stroke="#e5e5e5"
                          strokeWidth={1}
                        />
                      )}

                      {/* Avatar Text/Emoji inside node */}
                      <text
                        textAnchor="middle"
                        y={isCenter ? 6 : 5}
                        fontSize={isCenter ? 18 : 15}
                        className="select-none pointer-events-none"
                      >
                        {node.avatar}
                      </text>

                      {/* Outer Name Tag Badge */}
                      <g transform={`translate(0, ${isCenter ? 38 : 31})`}>
                        <rect
                          x={-30}
                          y={-8}
                          width={60}
                          height={15}
                          rx={4}
                          fill={isCenter ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)"}
                          stroke={isCenter ? "#000000" : "#e5e5e5"}
                          strokeWidth={0.5}
                        />
                        <text
                          textAnchor="middle"
                          y={2}
                          fontSize={8}
                          fontWeight="bold"
                          className={isCenter ? "fill-white" : "fill-neutral-800"}
                        >
                          {node.name.length > 6 ? node.name.substring(0, 5) + "..." : node.name}
                        </text>
                      </g>
                    </g>
                  );
                })}

              </g>
            </svg>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-neutral-400">
              <Users className="w-12 h-12 text-neutral-300 mb-2" />
              <p className="text-sm font-medium">未检测到有效角色</p>
            </div>
          )}

          {/* Interactive Node Hover Tooltip/Detail box */}
          {hoveredNode && (
            <div className="absolute bottom-3 left-3 right-3 bg-white border border-neutral-200 p-3 rounded-xl shadow-md z-10 animate-fade-in pointer-events-none">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{hoveredNode.avatar}</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-neutral-900">{hoveredNode.name}</span>
                  <span className="text-[9px] text-neutral-400 font-mono font-bold uppercase">
                    {hoveredNode.type === "center" && "🔍 当前中心角色"}
                    {hoveredNode.type === "character" && "⚡ AI 角色 (点击切换为中心)"}
                    {hoveredNode.type === "npc" && "👥 绑定 NPC 好友"}
                    {hoveredNode.type === "user" && "👤 玩家当前角色"}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-neutral-500 leading-relaxed truncate">{hoveredNode.desc}</p>
            </div>
          )}
        </div>

        {/* Sidebar Details and Edit Form list */}
        <div className="h-52 bg-white border-t border-neutral-100 flex flex-col shrink-0 min-h-[160px]">
          <div className="px-4 py-2 border-b border-neutral-50 flex justify-between items-center bg-neutral-50/50">
            <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">关系设定明细 (Relationship Configurations)</span>
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
              <HelpCircle className="w-3.5 h-3.5 text-neutral-300" />
              <span>点击文字或图形连线进行修改</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {centerChar ? (
              hasAnyRelations ? (
                <div className="space-y-2 max-w-lg mx-auto">
                  {nodes.filter(n => n.type !== "center").map(node => {
                    const isEditingThis = editingTargetId === node.id;
                    return (
                      <div key={node.id} className="flex items-center justify-between border border-neutral-100 p-2 rounded-xl text-xs bg-white hover:border-neutral-200 transition-colors">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-lg shrink-0">{node.avatar}</span>
                          <div className="flex flex-col min-w-0 flex-1 pr-2">
                            <span className="font-bold text-neutral-800 truncate">{node.name}</span>
                            {!isEditingThis ? (
                              <span 
                                onClick={() => handleStartEditRelation(node.id, node.relation)}
                                className="text-[11px] text-neutral-500 cursor-pointer hover:underline truncate"
                              >
                                {node.relation || "(暂无关系设定，点击添加)"}
                              </span>
                            ) : (
                              <div className="flex gap-1.5 items-center mt-1">
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={e => setEditingValue(e.target.value)}
                                  className="text-[11px] font-bold border-b border-black px-1 py-0.5 outline-none flex-1"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveRelation(node.id)}
                                  className="p-1 bg-black text-white rounded hover:bg-neutral-800"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingTargetId(null)}
                                  className="p-1 bg-neutral-100 text-neutral-500 rounded hover:bg-neutral-200"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {node.type === "character" && (
                          <button
                            onClick={() => handleNodeClick(node)}
                            className="text-[10px] text-neutral-400 hover:text-black font-semibold flex items-center gap-0.5 shrink-0 pl-1"
                          >
                            <span>设为中心</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-3">
                  <p className="text-xs text-neutral-500 max-w-sm leading-relaxed">
                    💡 当前角色尚未建立任何社交关系。<br />
                    您可以通过<strong className="text-neutral-800">“档案库-添加角色关联”</strong>添加角色关联，或者在<strong className="text-neutral-800">“查手机-检查-NPC绑定”</strong>中自动生成绑定 NPC。
                  </p>
                </div>
              )
            ) : null}
          </div>
        </div>

      </div>
    </div>
  );
}
