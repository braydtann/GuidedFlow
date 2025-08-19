import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('agent');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(email, password);
      } else {
        result = await register(email, password, role);
        if (result.success) {
          setIsLogin(true);
          setPassword('');
        }
      }

      if (result.success && isLogin) {
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 py-24">
          <div className="max-w-md">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <span className="text-primary-600 font-bold text-xl">GF</span>
              </div>
              <h1 className="text-3xl font-bold text-white">Guided Flow</h1>
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-6">
              Create intuitive guided experiences
            </h2>
            
            <p className="text-primary-100 text-lg leading-relaxed mb-8">
              Build powerful guided workflows with our visual editor. 
              From customer support flows to agent training modules, 
              create experiences that guide users step by step.
            </p>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-primary-100">
                <div className="w-2 h-2 bg-primary-300 rounded-full"></div>
                <span>Visual drag-and-drop flow builder</span>
              </div>
              <div className="flex items-center space-x-3 text-primary-100">
                <div className="w-2 h-2 bg-primary-300 rounded-full"></div>
                <span>Role-based content and permissions</span>
              </div>
              <div className="flex items-center space-x-3 text-primary-100">
                <div className="w-2 h-2 bg-primary-300 rounded-full"></div>
                <span>Analytics and session tracking</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md w-full">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">GF</span>
              </div>
              <span className="text-2xl font-bold text-secondary-800">Guided Flow</span>
            </div>
          </div>

          <div className="bg-white py-8 px-6 shadow-xl rounded-xl border border-secondary-200">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-secondary-900">
                {isLogin ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="mt-2 text-secondary-600">
                {isLogin 
                  ? 'Sign in to your account to continue' 
                  : 'Get started with Guided Flow today'
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="form-label">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input pr-10"
                    placeholder={isLogin ? 'Enter your password' : 'Create a password'}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-secondary-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-secondary-400" />
                    )}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label htmlFor="role" className="form-label">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="form-select"
                  >
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                  <p className="mt-1 text-sm text-secondary-500">
                    Choose your role. Agents can run flows, Admins can create and manage them.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="loading-spinner"></div>
                    <span>
                      {isLogin ? 'Signing in...' : 'Creating account...'}
                    </span>
                  </div>
                ) : (
                  <span>
                    {isLogin ? 'Sign in' : 'Create account'}
                  </span>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-secondary-600">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setPassword('');
                  }}
                  className="ml-2 font-medium text-primary-600 hover:text-primary-500"
                >
                  {isLogin ? 'Create account' : 'Sign in'}
                </button>
              </p>
            </div>

            {/* Demo accounts info */}
            <div className="mt-8 p-4 bg-secondary-50 rounded-lg">
              <h4 className="font-medium text-secondary-800 mb-2">Demo Accounts</h4>
              <p className="text-sm text-secondary-600 mb-2">
                For testing purposes, you can create accounts with these roles:
              </p>
              <ul className="text-sm text-secondary-600 space-y-1">
                <li>• <strong>Admin:</strong> Full access to authoring studio and analytics</li>
                <li>• <strong>Agent:</strong> Access to agent portal and guided flows</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;