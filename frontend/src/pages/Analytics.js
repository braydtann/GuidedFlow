import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ChartBarIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CalendarIcon,
  ClockIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

const Analytics = () => {
  const [overview, setOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({
    dateRange: '30',
    role: 'all',
    outcome: 'all',
  });

  useEffect(() => {
    loadAnalyticsData();
  }, [filters]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Load overview data
      const overviewResponse = await axios.get('/api/admin/analytics/overview');
      setOverview(overviewResponse.data);

      // Load sessions data
      const sessionsResponse = await axios.get('/api/admin/analytics/sessions');
      setSessions(sessionsResponse.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSessionDuration = (session) => {
    if (!session.completed_at) return 'In Progress';
    
    const start = new Date(session.started_at);
    const end = new Date(session.completed_at);
    const durationMinutes = Math.round((end - start) / (1000 * 60));
    
    if (durationMinutes < 60) {
      return `${durationMinutes}m`;
    }
    return `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`;
  };

  const getSessionStatus = (session) => {
    if (session.completed_at) {
      return { status: 'completed', color: 'green', icon: CheckCircleIcon };
    }
    return { status: 'in-progress', color: 'yellow', icon: ClockIcon };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900 mb-2">Analytics Dashboard</h1>
        <p className="text-secondary-600">Monitor guided flow performance and user engagement</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-secondary-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'sessions', name: 'Sessions', icon: UsersIcon },
            { id: 'escalations', name: 'Escalations', icon: ExclamationTriangleIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Metrics Cards */}
          {overview && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="analytics-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <UsersIcon className="w-6 h-6 text-primary-600" />
                  </div>
                </div>
                <div className="analytics-metric">
                  <div className="analytics-metric-value">{overview.total_sessions}</div>
                  <div className="analytics-metric-label">Total Sessions</div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="analytics-metric">
                  <div className="analytics-metric-value">{Math.round(overview.completion_rate)}%</div>
                  <div className="analytics-metric-label">Completion Rate</div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="analytics-metric">
                  <div className="analytics-metric-value">{overview.total_escalations}</div>
                  <div className="analytics-metric-label">Total Escalations</div>
                </div>
              </div>

              <div className="analytics-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <ArrowDownIcon className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <div className="analytics-metric">
                  <div className="analytics-metric-value">{Math.round(overview.escalation_rate)}%</div>
                  <div className="analytics-metric-label">Escalation Rate</div>
                </div>
              </div>
            </div>
          )}

          {/* Key Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-secondary-800 mb-4">Key Insights</h3>
              <div className="space-y-4">
                {overview && (
                  <>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm text-secondary-700">
                          <strong>{overview.completed_sessions}</strong> sessions completed successfully
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm text-secondary-700">
                          <strong>{overview.total_escalations}</strong> escalations require attention
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm text-secondary-700">
                          {overview.completion_rate > 80 
                            ? 'Excellent completion rate indicates effective flow design'
                            : 'Consider optimizing flows to improve completion rates'
                          }
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-secondary-800 mb-4">Recommendations</h3>
              <div className="space-y-4">
                {overview && overview.escalation_rate > 15 && (
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-700">
                      High escalation rate detected. Consider reviewing flow content and adding more guidance.
                    </p>
                  </div>
                )}
                
                {overview && overview.completion_rate < 70 && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700">
                      Low completion rate. Review flow structure and identify potential barriers.
                    </p>
                  </div>
                )}
                
                {overview && overview.completion_rate > 90 && overview.escalation_rate < 5 && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">
                      Excellent flow performance! Consider using this as a template for other flows.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div>
          {/* Filters */}
          <div className="card p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="form-select"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
              </div>

              <div>
                <label className="form-label">Role</label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                  className="form-select"
                >
                  <option value="all">All roles</option>
                  <option value="agent">Agent</option>
                  <option value="customer">Customer</option>
                </select>
              </div>

              <div>
                <label className="form-label">Outcome</label>
                <select
                  value={filters.outcome}
                  onChange={(e) => setFilters(prev => ({ ...prev, outcome: e.target.value }))}
                  className="form-select"
                >
                  <option value="all">All outcomes</option>
                  <option value="completed">Completed</option>
                  <option value="in-progress">In Progress</option>
                  <option value="abandoned">Abandoned</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-secondary-200">
              <h3 className="text-lg font-semibold text-secondary-800">Recent Sessions</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Session
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Started
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {sessions.slice(0, 10).map((session) => {
                    const { status, color, icon: StatusIcon } = getSessionStatus(session);
                    
                    return (
                      <tr key={session.id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-secondary-900">
                              {session.id.slice(0, 8)}...
                            </div>
                            <div className="text-sm text-secondary-500">
                              {session.guide_version_id ? 'Flow Session' : 'Unknown'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            session.role === 'agent'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {session.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          <div className="flex items-center space-x-1">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{formatDate(session.started_at)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {getSessionDuration(session)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <StatusIcon className={`w-4 h-4 text-${color}-500`} />
                            <span className={`text-sm capitalize text-${color}-700`}>
                              {status.replace('-', ' ')}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Escalations Tab */}
      {activeTab === 'escalations' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-secondary-800 mb-4">Escalation Management</h3>
          <p className="text-secondary-600">
            Escalation tracking and management features will be implemented in Phase 2.
          </p>
        </div>
      )}
    </div>
  );
};

export default Analytics;