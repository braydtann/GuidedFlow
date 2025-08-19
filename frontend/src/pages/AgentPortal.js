import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ArrowLeftIcon, 
  ArrowRightIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const AgentPortal = () => {
  const { guideSlug, stepSlug } = useParams();
  const { user } = useAuth();
  const [guides, setGuides] = useState([]);
  const [currentGuide, setCurrentGuide] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [session, setSession] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [crmData, setCrmData] = useState({
    crm_id: '',
    email: '',
    account_id: '',
    ticket_id: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [guideSlug, stepSlug]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all guides
      const guidesResponse = await axios.get('/api/guides');
      const guidesData = guidesResponse.data.filter(g => g.current_version_id);
      setGuides(guidesData);

      if (guideSlug) {
        const guide = guidesData.find(g => g.slug === guideSlug);
        if (guide) {
          setCurrentGuide(guide);
          
          // Load guide version
          const versionResponse = await axios.get(
            `/api/guides/${guide.id}/versions/${guide.current_version_id}`
          );
          setCurrentVersion(versionResponse.data);

          // Create or load session
          await createSession(guide.current_version_id);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (versionId) => {
    try {
      const sessionResponse = await axios.post('/api/sessions', {
        role: 'agent',
        guide_version_id: versionId,
      });
      const sessionData = sessionResponse.data;
      setSession(sessionData);

      // Initialize first step
      if (currentVersion?.graph?.nodes?.length > 0) {
        const firstNode = currentVersion.graph.nodes[0];
        setCurrentStep(firstNode);
        setStepIndex(0);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('Failed to create session');
    }
  };

  const handleCrmSubmit = async (e) => {
    e.preventDefault();
    if (!crmData.crm_id.trim()) {
      toast.error('CRM ID is required');
      return;
    }

    try {
      await axios.patch(`/api/sessions/${session.id}/crm-context`, {
        ...crmData,
        agent_id: user.id,
        agent_name: user.email,
      });
      
      // Log event
      await axios.post('/api/events', {
        session_id: session.id,
        action: 'crm_form_submitted',
        props: crmData,
      });

      toast.success('CRM information saved');
    } catch (error) {
      console.error('Failed to save CRM data:', error);
      toast.error('Failed to save CRM data');
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
      // Log step completion
      await axios.post('/api/events', {
        session_id: session.id,
        step_id: currentStep.id,
        action: 'step_completed',
        props: { answers: answers },
      });

      // Move to next step
      const nextIndex = stepIndex + 1;
      const nodes = currentVersion.graph.nodes;
      
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
        props: { total_steps: stepIndex + 1 },
      });

      toast.success('Session completed successfully!');
      
      // Generate CRM note
      generateCrmNote();
    } catch (error) {
      console.error('Failed to complete session:', error);
      toast.error('Failed to complete session');
    }
  };

  const generateCrmNote = () => {
    const note = `
Agent Session Summary
====================
Guide: ${currentGuide.title}
Agent: ${user.email}
Session ID: ${session.id}
CRM ID: ${crmData.crm_id}
Completed: ${new Date().toLocaleString()}

Steps Completed: ${stepIndex + 1}
${Object.keys(answers).length > 0 ? `
Key Information Collected:
${Object.entries(answers).map(([key, value]) => `- ${key}: ${value}`).join('\n')}
` : ''}
    `.trim();

    // Copy to clipboard
    navigator.clipboard.writeText(note).then(() => {
      toast.success('CRM note copied to clipboard!');
    });
  };

  const handleEscalation = async () => {
    try {
      const escalationData = {
        session_id: session.id,
        guide_id: currentGuide.id,
        step_id: currentStep.id,
        category: currentStep.data?.escalationCategory || 'general',
        message: `Agent escalation from step: ${currentStep.data?.title}`,
        history_snapshot: currentVersion.graph.nodes.slice(0, stepIndex + 1),
        contact: {
          agent_email: user.email,
          crm_id: crmData.crm_id,
        },
      };

      await axios.post('/api/escalations', escalationData);
      toast.success('Escalation submitted successfully');
    } catch (error) {
      console.error('Failed to escalate:', error);
      toast.error('Failed to submit escalation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Guide Selection View
  if (!guideSlug) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">Agent Portal</h1>
          <p className="text-secondary-600">Select a guided flow to assist customers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guides.map((guide) => (
            <Link
              key={guide.id}
              to={`/agent/${guide.slug}`}
              className="card p-6 hover:shadow-lg transition-shadow group"
            >
              <h3 className="font-semibold text-secondary-800 mb-2 group-hover:text-primary-600">
                {guide.title}
              </h3>
              <p className="text-sm text-secondary-600 mb-3 capitalize">
                Category: {guide.category}
              </p>
              {guide.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {guide.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-secondary-100 text-secondary-600 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-primary-600 text-sm font-medium">
                Start Flow →
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Flow Execution View
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <Link
          to="/agent"
          className="p-2 rounded-lg text-secondary-600 hover:bg-secondary-100"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">{currentGuide?.title}</h1>
          <p className="text-secondary-600">Agent Flow Session</p>
        </div>
      </div>

      {/* CRM Form */}
      {session && !crmData.crm_id && (
        <div className="crm-form mb-8">
          <div className="crm-form-header">
            <h3 className="crm-form-title">Customer Information</h3>
            <span className="crm-form-required">* Required</span>
          </div>
          
          <form onSubmit={handleCrmSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">CRM ID *</label>
                <input
                  type="text"
                  required
                  value={crmData.crm_id}
                  onChange={(e) => setCrmData(prev => ({ ...prev, crm_id: e.target.value }))}
                  className="form-input"
                  placeholder="Enter CRM ID"
                />
              </div>
              
              <div>
                <label className="form-label">Customer Email</label>
                <input
                  type="email"
                  value={crmData.email}
                  onChange={(e) => setCrmData(prev => ({ ...prev, email: e.target.value }))}
                  className="form-input"
                  placeholder="customer@example.com"
                />
              </div>
              
              <div>
                <label className="form-label">Account ID</label>
                <input
                  type="text"
                  value={crmData.account_id}
                  onChange={(e) => setCrmData(prev => ({ ...prev, account_id: e.target.value }))}
                  className="form-input"
                  placeholder="Account identifier"
                />
              </div>
              
              <div>
                <label className="form-label">Ticket ID</label>
                <input
                  type="text"
                  value={crmData.ticket_id}
                  onChange={(e) => setCrmData(prev => ({ ...prev, ticket_id: e.target.value }))}
                  className="form-input"
                  placeholder="Support ticket number"
                />
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary">
              Start Flow Session
            </button>
          </form>
        </div>
      )}

      {/* Current Step */}
      {currentStep && crmData.crm_id && (
        <div className="card p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-secondary-800 mb-2">
                {currentStep.data?.title}
              </h2>
              <p className="text-sm text-secondary-500">
                Step {stepIndex + 1} of {currentVersion?.graph?.nodes?.length || 0}
              </p>
            </div>
            
            {currentStep.data?.escalationEnabled && (
              <button
                onClick={handleEscalation}
                className="btn btn-danger flex items-center space-x-2"
              >
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span>Escalate</span>
              </button>
            )}
          </div>

          {currentStep.data?.content && (
            <div className="mb-6 p-4 bg-secondary-50 rounded-lg">
              <p className="text-secondary-700">{currentStep.data.content}</p>
            </div>
          )}

          {/* Input Fields */}
          {currentStep.data?.inputs && currentStep.data.inputs.length > 0 && (
            <div className="space-y-4 mb-6">
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
                      {/* Add options based on input configuration */}
                    </select>
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

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-secondary-500">
              CRM ID: {crmData.crm_id}
            </div>
            
            <div className="flex items-center space-x-3">
              {stepIndex < (currentVersion?.graph?.nodes?.length || 0) - 1 ? (
                <button
                  onClick={handleStepComplete}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <span>Next Step</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={completeSession}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  <span>Complete & Generate CRM Note</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentPortal;