import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  PlusIcon, 
  PlayIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  EyeIcon,
  CalendarIcon,
  ClockIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user, isAdmin, isAgent } = useAuth();
  const [guides, setGuides] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load guides
      const guidesResponse = await axios.get('/api/guides');
      setGuides(guidesResponse.data);

      // Load analytics if admin
      if (isAdmin()) {
        try {
          const analyticsResponse = await axios.get('/api/admin/analytics/overview');
          setAnalytics(analyticsResponse.data);
        } catch (error) {
          console.error('Failed to load analytics:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">
              Welcome back, {user.email.split('@')[0]}!
            </h1>
            <p className="mt-2 text-secondary-600">
              {isAdmin() && "Manage your guided flows and view analytics"}
              {isAgent() && !isAdmin() && "Access your guided flows and agent tools"}
            </p>
          </div>
          
          {isAdmin() && (
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <Link
                to="/studio"
                className="btn btn-primary flex items-center space-x-2"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Create New Flow</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Cards (Admin only) */}
      {isAdmin() && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="analytics-card">
            <div className="analytics-metric">
              <div className="analytics-metric-value">
                {analytics.total_sessions}
              </div>
              <div className="analytics-metric-label">Total Sessions</div>
            </div>
          </div>
          
          <div className="analytics-card">
            <div className="analytics-metric">
              <div className="analytics-metric-value">
                {Math.round(analytics.completion_rate)}%
              </div>
              <div className="analytics-metric-label">Completion Rate</div>
            </div>
          </div>
          
          <div className="analytics-card">
            <div className="analytics-metric">
              <div className="analytics-metric-value">
                {analytics.total_escalations}
              </div>
              <div className="analytics-metric-label">Total Escalations</div>
            </div>
          </div>
          
          <div className="analytics-card">
            <div className="analytics-metric">
              <div className="analytics-metric-value">
                {Math.round(analytics.escalation_rate)}%
              </div>
              <div className="analytics-metric-label">Escalation Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isAdmin() && (
            <>
              <Link
                to="/studio"
                className="card p-6 hover:shadow-lg transition-shadow cursor-pointer group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                    <Cog6ToothIcon className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary-800">Authoring Studio</h3>
                    <p className="text-sm text-secondary-600">Create and edit guided flows</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/analytics"
                className="card p-6 hover:shadow-lg transition-shadow cursor-pointer group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <ChartBarIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary-800">Analytics</h3>
                    <p className="text-sm text-secondary-600">View detailed reports and insights</p>
                  </div>
                </div>
              </Link>
            </>
          )}

          {isAgent() && (
            <Link
              to="/agent"
              className="card p-6 hover:shadow-lg transition-shadow cursor-pointer group"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <PlayIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-secondary-800">Agent Portal</h3>
                  <p className="text-sm text-secondary-600">Access guided flows and tools</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Recent Flows */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-secondary-800">
            {isAdmin() ? 'Manage Flows' : 'Available Flows'}
          </h2>
          {isAdmin() && guides.length > 0 && (
            <Link to="/studio" className="text-primary-600 hover:text-primary-700 font-medium">
              View all →
            </Link>
          )}
        </div>

        {guides.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Cog6ToothIcon className="w-8 h-8 text-secondary-400" />
            </div>
            <h3 className="text-lg font-semibold text-secondary-800 mb-2">No flows yet</h3>
            <p className="text-secondary-600 mb-4">
              {isAdmin() 
                ? 'Get started by creating your first guided flow.'
                : 'No flows have been created yet. Contact your administrator.'
              }
            </p>
            {isAdmin() && (
              <Link to="/studio" className="btn btn-primary">
                <PlusIcon className="w-5 h-5 mr-2" />
                Create Your First Flow
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide) => (
              <div key={guide.id} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-secondary-800 mb-2">{guide.title}</h3>
                    <p className="text-sm text-secondary-600 mb-2">
                      Category: <span className="capitalize">{guide.category}</span>
                    </p>
                    {guide.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
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
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-secondary-500 mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{new Date(guide.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {guide.current_version_id ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Published
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Draft
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {isAgent() && guide.current_version_id && (
                      <Link
                        to={`/agent/${guide.slug}`}
                        className="btn btn-secondary btn-sm flex items-center space-x-1"
                      >
                        <PlayIcon className="w-4 h-4" />
                        <span>Run</span>
                      </Link>
                    )}
                    
                    {isAdmin() && (
                      <Link
                        to={`/studio/${guide.id}`}
                        className="btn btn-primary btn-sm flex items-center space-x-1"
                      >
                        <Cog6ToothIcon className="w-4 h-4" />
                        <span>Edit</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;