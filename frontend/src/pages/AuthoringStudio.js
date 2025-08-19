import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  PlusIcon, 
  TrashIcon, 
  SaveIcon,
  EyeIcon,
  ArrowLeftIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import CustomNode from '../components/flow/CustomNode';
import NodePropertiesPanel from '../components/flow/NodePropertiesPanel';

const nodeTypes = {
  custom: CustomNode,
};

const AuthoringStudio = () => {
  const { guideId } = useParams();
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [guide, setGuide] = useState(null);
  const [guideVersion, setGuideVersion] = useState(null);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Guide metadata
  const [guideTitle, setGuideTitle] = useState('');
  const [guideCategory, setGuideCategory] = useState('general');
  const [guideTags, setGuideTags] = useState('');

  useEffect(() => {
    if (guideId) {
      loadGuide();
    } else {
      setLoading(false);
    }
  }, [guideId]);

  const loadGuide = async () => {
    try {
      const guideResponse = await axios.get(`/api/guides/${guideId}`);
      const guideData = guideResponse.data;
      setGuide(guideData);
      setGuideTitle(guideData.title);
      setGuideCategory(guideData.category);
      setGuideTags(guideData.tags.join(', '));

      if (guideData.current_version_id) {
        const versionResponse = await axios.get(
          `/api/guides/${guideId}/versions/${guideData.current_version_id}`
        );
        const versionData = versionResponse.data;
        setGuideVersion(versionData);

        // Load nodes and edges from graph
        if (versionData.graph && versionData.graph.nodes) {
          setNodes(versionData.graph.nodes);
          setEdges(versionData.graph.edges || []);
        }
      }
    } catch (error) {
      console.error('Failed to load guide:', error);
      toast.error('Failed to load guide');
    } finally {
      setLoading(false);
    }
  };

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setShowPropertiesPanel(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowPropertiesPanel(false);
  }, []);

  const addNode = (type = 'instruction') => {
    const newNodeId = `node-${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: 'custom',
      position: { x: 250, y: 100 },
      data: {
        type: type,
        title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        content: '',
        visibility: 'customer',
        style: {},
        inputs: [],
        actions: [],
        escalationEnabled: false,
      },
    };

    setNodes((nds) => nds.concat(newNode));
    setSelectedNode(newNode);
    setShowPropertiesPanel(true);
  };

  const updateNode = (nodeId, updates) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
  };

  const deleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
      setShowPropertiesPanel(false);
    }
  };

  const saveGuide = async () => {
    if (!guideTitle.trim()) {
      toast.error('Guide title is required');
      return;
    }

    setSaving(true);
    try {
      let currentGuide = guide;

      // Create or update guide
      if (!currentGuide) {
        const response = await axios.post('/api/guides', {
          slug: guideTitle.toLowerCase().replace(/\s+/g, '-'),
          title: guideTitle,
          category: guideCategory,
          tags: guideTags.split(',').map(tag => tag.trim()).filter(tag => tag),
        });
        currentGuide = response.data;
        setGuide(currentGuide);
        navigate(`/studio/${currentGuide.id}`, { replace: true });
      }

      // Create or update version with current graph
      const versionData = {
        graph: {
          nodes: nodes,
          edges: edges,
        },
        crm_note_template: guideVersion?.crm_note_template || '',
      };

      await axios.post(`/api/guides/${currentGuide.id}/versions`, versionData);
      
      toast.success('Guide saved successfully!');
      
      // Reload to get updated data
      if (currentGuide.id) {
        loadGuide();
      }
    } catch (error) {
      console.error('Failed to save guide:', error);
      toast.error('Failed to save guide');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-secondary-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg text-secondary-600 hover:bg-secondary-100"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <Cog6ToothIcon className="w-6 h-6 text-primary-600" />
            <h1 className="text-xl font-semibold text-secondary-800">
              {guide ? 'Edit Flow' : 'Create New Flow'}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={guideTitle}
              onChange={(e) => setGuideTitle(e.target.value)}
              placeholder="Flow Title"
              className="input w-64"
            />
            
            <select
              value={guideCategory}
              onChange={(e) => setGuideCategory(e.target.value)}
              className="form-select w-32"
            >
              <option value="general">General</option>
              <option value="camera">Camera</option>
              <option value="sensor">Sensor</option>
              <option value="account">Account</option>
              <option value="support">Support</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
            className={`btn ${showPropertiesPanel ? 'btn-primary' : 'btn-secondary'}`}
          >
            <EyeIcon className="w-4 h-4 mr-2" />
            Properties
          </button>
          
          <button
            onClick={saveGuide}
            disabled={saving}
            className="btn btn-primary disabled:opacity-50"
          >
            {saving ? (
              <div className="loading-spinner mr-2"></div>
            ) : (
              <SaveIcon className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            className="bg-secondary-50"
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
            
            {/* Add Node Panel */}
            <Panel position="top-left" className="bg-white rounded-lg shadow-lg border border-secondary-200 p-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-secondary-700">Add Node:</span>
                <button
                  onClick={() => addNode('instruction')}
                  className="btn btn-secondary btn-sm"
                >
                  Instruction
                </button>
                <button
                  onClick={() => addNode('question')}
                  className="btn btn-secondary btn-sm"
                >
                  Question
                </button>
                <button
                  onClick={() => addNode('form')}
                  className="btn btn-secondary btn-sm"
                >
                  Form
                </button>
                <button
                  onClick={() => addNode('decision')}
                  className="btn btn-secondary btn-sm"
                >
                  Decision
                </button>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Properties Panel */}
        {showPropertiesPanel && (
          <NodePropertiesPanel
            selectedNode={selectedNode}
            onUpdateNode={updateNode}
            onDeleteNode={deleteNode}
            onClose={() => setShowPropertiesPanel(false)}
          />
        )}
      </div>
    </div>
  );
};

export default AuthoringStudio;