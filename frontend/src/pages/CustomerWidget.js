import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ArrowRightIcon, 
  ExclamationTriangleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

const CustomerWidget = () => {
  const { guideSlug, stepSlug } = useParams();
  const [guide, setGuide] = useState(null);
  const [version, setVersion] = useState(null);
  const [session, setSession] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [customerInfo, setCustomerInfo] = useState({
    email: '',
    phone: '',
  });
  const [showEscalation, setShowEscalation] = useState(false);
  const [escalationMessage, setEscalationMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGuideAndStartSession();
  }, [guideSlug, stepSlug]);

  const loadGuideAndStartSession = async () => {
    try {
      setLoading(true);
      
      // Load all guides to find the one with matching slug
      const guidesResponse = await axios.get('/api/guides');
      const guides = guidesResponse.data.filter(g => g.current_version_id);
      const targetGuide = guides.find(g => g.slug === guideSlug);
      
      if (!targetGuide) {
        toast.error('Guide not found');
        return;
      }
      
      setGuide(targetGuide);
      
      // Load guide version
      const versionResponse = await axios.get(
        `/api/guides/${targetGuide.id}/versions/${targetGuide.current_version_id}`
      );
      const versionData = versionResponse.data;
      setVersion(versionData);

      // Create customer session
      const sessionResponse = await axios.post('/api/sessions', {
        role: 'customer',
        guide_version_id: targetGuide.current_version_id,
      });
      setSession(sessionResponse.data);

      // Initialize first step or navigate to specific step
      if (versionData.graph?.nodes?.length > 0) {
        let targetStepIndex = 0;
        
        if (stepSlug) {
          targetStepIndex = versionData.graph.nodes.findIndex(
            node => node.data?.slug === stepSlug || node.id === stepSlug
          );
          if (targetStepIndex === -1) targetStepIndex = 0;
        }
        
        setStepIndex(targetStepIndex);
        setCurrentStep(versionData.graph.nodes[targetStepIndex]);
      }
    } catch (error) {
      console.error('Failed to load guide:', error);
      toast.error('Failed to load guide');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (inputId, value) => {
    setAnswers(prev => ({
      ...prev,
      [inputId]: value
    }));
  };

  const handleStepComplete = async () => {
    try {
      // Validate required fields
      const requiredInputs = currentStep.data?.inputs?.filter(input => input.required) || [];
      const missingInputs = requiredInputs.filter(input => !answers[input.id]?.trim());
      
      if (missingInputs.length > 0) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Log step completion
      await axios.post('/api/events', {
        session_id: session.id,
        step_id: currentStep.id,
        action: 'step_completed',
        props: { answers: answers },
      });

      // Move to next step
      const nextIndex = stepIndex + 1;
      const nodes = version.graph.nodes.filter(node => 
        node.data?.visibility !== 'agent' // Hide agent-only steps
      );
      
      if (nextIndex < nodes.length) {
        setStepIndex(nextIndex);
        setCurrentStep(nodes[nextIndex]);
        setAnswers({});
      } else {
        // Complete session
        await completeSession();
      }
    } catch (error) {
      console.error('Failed to complete step:', error);
      toast.error('Failed to complete step');
    }
  };

  const completeSession = async () => {
    try {
      await axios.post(`/api/sessions/${session.id}/complete`);
      
      await axios.post('/api/events', {
        session_id: session.id,
        action: 'session_completed',
        props: { 
          total_steps: stepIndex + 1,
          completion_type: 'customer_completed'
        },
      });

      // Show completion message
      setCurrentStep({
        data: {
          type: 'completion',
          title: 'Thank you!',
          content: 'You have successfully completed this guided flow. If you need further assistance, please contact support.',
        }
      });
    } catch (error) {
      console.error('Failed to complete session:', error);
      toast.error('Failed to complete session');
    }
  };

  const handleEscalation = async () => {
    try {
      if (!escalationMessage.trim()) {
        toast.error('Please describe your issue');
        return;
      }

      const escalationData = {
        session_id: session.id,
        guide_id: guide.id,
        step_id: currentStep.id,
        category: currentStep.data?.escalationCategory || 'general',
        message: escalationMessage,
        history_snapshot: version.graph.nodes.slice(0, stepIndex + 1).map(node => ({
          step: node.data?.title,
          answers: answers,
        })),
        contact: customerInfo,
      };

      await axios.post('/api/escalations', escalationData);
      
      await axios.post('/api/events', {
        session_id: session.id,
        step_id: currentStep.id,
        action: 'escalation_submitted',
        props: escalationData,
      });

      setShowEscalation(false);
      setEscalationMessage('');
      toast.success('Your issue has been escalated to our support team. They will contact you soon.');
    } catch (error) {
      console.error('Failed to escalate:', error);
      toast.error('Failed to submit escalation');
    }
  };

  if (loading) {
    return (
      <div className="widget-container min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!guide || !currentStep) {
    return (
      <div className="widget-container min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-secondary-800 mb-2">
            Guide not found
          </h2>
          <p className="text-secondary-600">
            The requested guided flow could not be found or is not available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-container min-h-screen">
      {/* Header */}
      <div className="widget-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-secondary-800">{guide.title}</h1>
            <p className="text-sm text-secondary-500">
              Step {stepIndex + 1} of {version.graph.nodes.filter(n => n.data?.visibility !== 'agent').length}
            </p>
          </div>
          
          {currentStep.data?.escalationEnabled && currentStep.data.type !== 'completion' && (
            <button
              onClick={() => setShowEscalation(true)}
              className="btn btn-secondary btn-sm flex items-center space-x-2"
            >
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span>Need Help?</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="widget-content">
        {currentStep.data?.type === 'completion' ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-secondary-800 mb-4">
              {currentStep.data.title}
            </h2>
            <p className="text-secondary-600 max-w-md mx-auto">
              {currentStep.data.content}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-secondary-800 mb-4">
                {currentStep.data?.title}
              </h2>
              
              {currentStep.data?.content && (
                <div className="prose prose-sm max-w-none mb-6">
                  <p className="text-secondary-700 leading-relaxed">
                    {currentStep.data.content}
                  </p>
                </div>
              )}
            </div>

            {/* Input Fields */}
            {currentStep.data?.inputs && currentStep.data.inputs.length > 0 && (
              <div className="space-y-6 mb-8">
                {currentStep.data.inputs.map((input) => (
                  <div key={input.id}>
                    <label className="form-label">
                      {input.label}
                      {input.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {input.type === 'textarea' ? (
                      <textarea
                        required={input.required}
                        value={answers[input.id] || ''}
                        onChange={(e) => handleInputChange(input.id, e.target.value)}
                        placeholder={input.placeholder}
                        className="form-textarea"
                        rows={4}
                      />
                    ) : input.type === 'select' ? (
                      <select
                        required={input.required}
                        value={answers[input.id] || ''}
                        onChange={(e) => handleInputChange(input.id, e.target.value)}
                        className="form-select"
                      >
                        <option value="">Select an option</option>
                        {input.options?.map((option, index) => (
                          <option key={index} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : input.type === 'radio' ? (
                      <div className="space-y-2">
                        {input.options?.map((option, index) => (
                          <label key={index} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={input.id}
                              value={option.value}
                              checked={answers[input.id] === option.value}
                              onChange={(e) => handleInputChange(input.id, e.target.value)}
                              className="form-radio"
                            />
                            <span className="text-secondary-700">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        type={input.type}
                        required={input.required}
                        value={answers[input.id] || ''}
                        onChange={(e) => handleInputChange(input.id, e.target.value)}
                        placeholder={input.placeholder}
                        className="form-input"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      {currentStep.data?.type !== 'completion' && (
        <div className="widget-navigation">
          <div></div>
          <button
            onClick={handleStepComplete}
            className="btn btn-primary flex items-center space-x-2"
          >
            <span>
              {stepIndex < version.graph.nodes.filter(n => n.data?.visibility !== 'agent').length - 1
                ? 'Continue'
                : 'Complete'
              }
            </span>
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Escalation Modal */}
      {showEscalation && (
        <div className="escalation-modal">
          <div className="escalation-content">
            <div className="escalation-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-secondary-800">
                  Need Additional Help?
                </h3>
                <button
                  onClick={() => setShowEscalation(false)}
                  className="text-secondary-400 hover:text-secondary-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-secondary-600 mt-2">
                Describe your issue and our support team will help you directly.
              </p>
            </div>

            <div className="escalation-body space-y-4">
              <div>
                <label className="form-label">Email (optional)</label>
                <input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Phone (optional)</label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Your phone number"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Describe your issue *</label>
                <textarea
                  required
                  value={escalationMessage}
                  onChange={(e) => setEscalationMessage(e.target.value)}
                  placeholder="Please describe what you need help with..."
                  className="form-textarea"
                  rows={4}
                />
              </div>
            </div>

            <div className="escalation-footer">
              <button
                onClick={() => setShowEscalation(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleEscalation}
                className="btn btn-primary"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerWidget;