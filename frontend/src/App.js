import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AuthoringStudio from './pages/AuthoringStudio';
import AgentPortal from './pages/AgentPortal';
import CustomerWidget from './pages/CustomerWidget';
import Analytics from './pages/Analytics';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Toaster position="top-right" />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/widget/:guideSlug" element={<CustomerWidget />} />
            <Route path="/widget/:guideSlug/:stepSlug" element={<CustomerWidget />} />
            
            {/* Protected routes with navbar */}
            <Route path="/*" element={<AppWithNavbar />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

function AppWithNavbar() {
  return (
    <>
      <Navbar />
      <div className="pt-16">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Dashboard - All authenticated users */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Authoring Studio - Admin only */}
          <Route 
            path="/studio" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AuthoringStudio />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/studio/:guideId" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AuthoringStudio />
              </ProtectedRoute>
            } 
          />
          
          {/* Agent Portal - Agent and Admin */}
          <Route 
            path="/agent" 
            element={
              <ProtectedRoute requiredRole={["agent", "admin"]}>
                <AgentPortal />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/agent/:guideSlug" 
            element={
              <ProtectedRoute requiredRole={["agent", "admin"]}>
                <AgentPortal />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/agent/:guideSlug/:stepSlug" 
            element={
              <ProtectedRoute requiredRole={["agent", "admin"]}>
                <AgentPortal />
              </ProtectedRoute>
            } 
          />
          
          {/* Analytics - Admin only */}
          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute requiredRole="admin">
                <Analytics />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </>
  );
}

export default App;