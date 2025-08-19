import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { 
  ChatBubbleLeftIcon, 
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  ArrowRightCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const CustomNode = ({ data, selected }) => {
  const getNodeIcon = () => {
    switch (data.type) {
      case 'question':
        return QuestionMarkCircleIcon;
      case 'form':
        return DocumentTextIcon;
      case 'decision':
        return ArrowRightCircleIcon;
      default:
        return ChatBubbleLeftIcon;
    }
  };

  const getNodeColor = () => {
    switch (data.visibility) {
      case 'agent':
        return 'border-blue-400 bg-blue-50';
      case 'customer':
        return 'border-green-400 bg-green-50';
      default:
        return 'border-secondary-200 bg-white';
    }
  };

  const Icon = getNodeIcon();

  return (
    <>
      <Handle type="target" position={Position.Top} />
      
      <div className={`custom-node ${selected ? 'selected' : ''} ${getNodeColor()}`}>
        <div className="node-header">
          <div className="flex items-center space-x-2">
            <Icon className="w-4 h-4 text-secondary-600" />
            <span className="node-title">{data.title || 'Untitled'}</span>
          </div>
          <span className="node-type">{data.type}</span>
        </div>
        
        <div className="node-content">
          {data.content && (
            <p className="text-xs text-secondary-600 mb-2 line-clamp-2">
              {data.content}
            </p>
          )}
          
          {data.inputs && data.inputs.length > 0 && (
            <div className="text-xs text-secondary-500">
              {data.inputs.length} input{data.inputs.length !== 1 ? 's' : ''}
            </div>
          )}
          
          {data.escalationEnabled && (
            <div className="flex items-center space-x-1 text-xs text-orange-600 mt-2">
              <ExclamationTriangleIcon className="w-3 h-3" />
              <span>Escalation enabled</span>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className={`px-2 py-1 rounded-full ${
              data.visibility === 'agent' 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-green-100 text-green-600'
            }`}>
              {data.visibility}
            </span>
          </div>
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} />
    </>
  );
};

export default memo(CustomNode);