import React, { useState, useEffect } from 'react';
import { XMarkIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

const NodePropertiesPanel = ({ selectedNode, onUpdateNode, onDeleteNode, onClose }) => {
  const [nodeData, setNodeData] = useState({});

  useEffect(() => {
    if (selectedNode) {
      setNodeData(selectedNode.data);
    }
  }, [selectedNode]);

  const handleInputChange = (field, value) => {
    const updatedData = { ...nodeData, [field]: value };
    setNodeData(updatedData);
    if (selectedNode) {
      onUpdateNode(selectedNode.id, updatedData);
    }
  };

  const addInput = () => {
    const newInput = {
      id: `input-${Date.now()}`,
      type: 'text',
      label: 'New Input',
      required: false,
      placeholder: '',
    };
    const updatedInputs = [...(nodeData.inputs || []), newInput];
    handleInputChange('inputs', updatedInputs);
  };

  const updateInput = (inputId, updates) => {
    const updatedInputs = (nodeData.inputs || []).map(input =>
      input.id === inputId ? { ...input, ...updates } : input
    );
    handleInputChange('inputs', updatedInputs);
  };

  const removeInput = (inputId) => {
    const updatedInputs = (nodeData.inputs || []).filter(input => input.id !== inputId);
    handleInputChange('inputs', updatedInputs);
  };

  if (!selectedNode) {
    return (
      <div className="property-panel">
        <div className="p-6 text-center text-secondary-500">
          <p>Select a node to edit its properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="property-panel">
      <div className="flex items-center justify-between p-4 border-b border-secondary-200">
        <h3 className="font-semibold text-secondary-800">Node Properties</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-secondary-400 hover:bg-secondary-100"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Basic Properties */}
        <div className="property-section">
          <h4 className="font-medium text-secondary-700 mb-3">Basic Settings</h4>
          
          <div className="property-field">
            <label className="form-label">Title</label>
            <input
              type="text"
              value={nodeData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="form-input"
              placeholder="Enter title"
            />
          </div>

          <div className="property-field">
            <label className="form-label">Type</label>
            <select
              value={nodeData.type || 'instruction'}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="form-select"
            >
              <option value="instruction">Instruction</option>
              <option value="question">Question</option>
              <option value="form">Form</option>
              <option value="decision">Decision</option>
            </select>
          </div>

          <div className="property-field">
            <label className="form-label">Content</label>
            <textarea
              value={nodeData.content || ''}
              onChange={(e) => handleInputChange('content', e.target.value)}
              className="form-textarea"
              rows={4}
              placeholder="Enter content or instructions"
            />
          </div>

          <div className="property-field">
            <label className="form-label">Visibility</label>
            <select
              value={nodeData.visibility || 'customer'}
              onChange={(e) => handleInputChange('visibility', e.target.value)}
              className="form-select"
            >
              <option value="customer">Customer & Agent</option>
              <option value="agent">Agent Only</option>
            </select>
            <p className="text-xs text-secondary-500 mt-1">
              Agent-only content is hidden from customers
            </p>
          </div>
        </div>

        {/* Inputs Section */}
        {(nodeData.type === 'question' || nodeData.type === 'form') && (
          <div className="property-section">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-secondary-700">Input Fields</h4>
              <button
                onClick={addInput}
                className="btn btn-secondary btn-sm flex items-center space-x-1"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Input</span>
              </button>
            </div>

            {nodeData.inputs && nodeData.inputs.length > 0 ? (
              <div className="space-y-4">
                {nodeData.inputs.map((input) => (
                  <div key={input.id} className="border border-secondary-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-secondary-700">Input Field</span>
                      <button
                        onClick={() => removeInput(input.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-secondary-600 mb-1">
                          Label
                        </label>
                        <input
                          type="text"
                          value={input.label || ''}
                          onChange={(e) => updateInput(input.id, { label: e.target.value })}
                          className="form-input text-sm"
                          placeholder="Field label"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-secondary-600 mb-1">
                          Type
                        </label>
                        <select
                          value={input.type || 'text'}
                          onChange={(e) => updateInput(input.id, { type: e.target.value })}
                          className="form-select text-sm"
                        >
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="number">Number</option>
                          <option value="tel">Phone</option>
                          <option value="textarea">Long Text</option>
                          <option value="select">Dropdown</option>
                          <option value="radio">Radio Buttons</option>
                          <option value="checkbox">Checkboxes</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-secondary-600 mb-1">
                          Placeholder
                        </label>
                        <input
                          type="text"
                          value={input.placeholder || ''}
                          onChange={(e) => updateInput(input.id, { placeholder: e.target.value })}
                          className="form-input text-sm"
                          placeholder="Placeholder text"
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`required-${input.id}`}
                          checked={input.required || false}
                          onChange={(e) => updateInput(input.id, { required: e.target.checked })}
                          className="form-checkbox"
                        />
                        <label 
                          htmlFor={`required-${input.id}`}
                          className="ml-2 text-xs text-secondary-600"
                        >
                          Required field
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-secondary-500 text-center py-4">
                No input fields added yet
              </p>
            )}
          </div>
        )}

        {/* Escalation Settings */}
        <div className="property-section">
          <h4 className="font-medium text-secondary-700 mb-3">Escalation Settings</h4>
          
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="escalation-enabled"
              checked={nodeData.escalationEnabled || false}
              onChange={(e) => handleInputChange('escalationEnabled', e.target.checked)}
              className="form-checkbox"
            />
            <label htmlFor="escalation-enabled" className="ml-2 text-sm text-secondary-700">
              Enable escalation for this step
            </label>
          </div>
          
          {nodeData.escalationEnabled && (
            <div className="space-y-3">
              <div>
                <label className="form-label">Escalation Category</label>
                <select
                  value={nodeData.escalationCategory || 'general'}
                  onChange={(e) => handleInputChange('escalationCategory', e.target.value)}
                  className="form-select"
                >
                  <option value="general">General</option>
                  <option value="technical">Technical</option>
                  <option value="billing">Billing</option>
                  <option value="account">Account</option>
                </select>
              </div>
              
              <div>
                <label className="form-label">Escalation Message</label>
                <textarea
                  value={nodeData.escalationMessage || ''}
                  onChange={(e) => handleInputChange('escalationMessage', e.target.value)}
                  className="form-textarea"
                  rows={3}
                  placeholder="Custom message for this escalation"
                />
              </div>
            </div>
          )}
        </div>

        {/* Styling */}
        <div className="property-section">
          <h4 className="font-medium text-secondary-700 mb-3">Styling</h4>
          
          <div className="property-field">
            <label className="form-label">Background Color</label>
            <input
              type="color"
              value={nodeData.style?.backgroundColor || '#ffffff'}
              onChange={(e) => handleInputChange('style', { 
                ...nodeData.style, 
                backgroundColor: e.target.value 
              })}
              className="w-full h-10 border border-secondary-300 rounded-lg cursor-pointer"
            />
          </div>

          <div className="property-field">
            <label className="form-label">Text Color</label>
            <input
              type="color"
              value={nodeData.style?.color || '#000000'}
              onChange={(e) => handleInputChange('style', { 
                ...nodeData.style, 
                color: e.target.value 
              })}
              className="w-full h-10 border border-secondary-300 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-secondary-200 p-4">
        <button
          onClick={() => onDeleteNode(selectedNode.id)}
          className="w-full btn btn-danger flex items-center justify-center space-x-2"
        >
          <TrashIcon className="w-4 h-4" />
          <span>Delete Node</span>
        </button>
      </div>
    </div>
  );
};

export default NodePropertiesPanel;