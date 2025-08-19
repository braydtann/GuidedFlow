#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Guided Flow Platform
Tests all authentication, guide management, session, and analytics endpoints
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class GuidedFlowAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.admin_token = None
        self.agent_token = None
        self.customer_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'users': [],
            'guides': [],
            'sessions': [],
            'escalations': []
        }

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")

    def make_request(self, method: str, endpoint: str, data: Dict = None, token: str = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request and return success status and response data"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except Exception as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.make_request('GET', 'health')
        self.log_test("Health Check", success and response.get('status') == 'healthy')
        return success

    def test_user_registration(self):
        """Test user registration for different roles"""
        timestamp = datetime.now().strftime('%H%M%S')
        
        # Test admin registration
        admin_data = {
            "email": f"admin_{timestamp}@test.com",
            "password": "AdminPass123!",
            "role": "admin"
        }
        success, response = self.make_request('POST', 'auth/register', admin_data)
        self.log_test("Admin Registration", success and response.get('message') == 'User created successfully')
        if success:
            self.created_resources['users'].append(admin_data)

        # Test agent registration
        agent_data = {
            "email": f"agent_{timestamp}@test.com",
            "password": "AgentPass123!",
            "role": "agent"
        }
        success, response = self.make_request('POST', 'auth/register', agent_data)
        self.log_test("Agent Registration", success and response.get('message') == 'User created successfully')
        if success:
            self.created_resources['users'].append(agent_data)

        # Test customer registration
        customer_data = {
            "email": f"customer_{timestamp}@test.com",
            "password": "CustomerPass123!",
            "role": "customer"
        }
        success, response = self.make_request('POST', 'auth/register', customer_data)
        self.log_test("Customer Registration", success and response.get('message') == 'User created successfully')
        if success:
            self.created_resources['users'].append(customer_data)

        # Test duplicate registration
        success, response = self.make_request('POST', 'auth/register', admin_data, expected_status=400)
        self.log_test("Duplicate Registration Prevention", success and 'already exists' in response.get('detail', ''))

        return len(self.created_resources['users']) >= 3

    def test_user_login(self):
        """Test user login for different roles"""
        if not self.created_resources['users']:
            self.log_test("Login Test", False, "No users created for login test")
            return False

        # Login as admin
        admin_user = self.created_resources['users'][0]  # First user is admin
        success, response = self.make_request('POST', 'auth/login', {
            "email": admin_user['email'],
            "password": admin_user['password']
        })
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.log_test("Admin Login", True, f"Role: {response['user']['role']}")
        else:
            self.log_test("Admin Login", False, str(response))

        # Login as agent
        if len(self.created_resources['users']) > 1:
            agent_user = self.created_resources['users'][1]
            success, response = self.make_request('POST', 'auth/login', {
                "email": agent_user['email'],
                "password": agent_user['password']
            })
            
            if success and 'access_token' in response:
                self.agent_token = response['access_token']
                self.log_test("Agent Login", True, f"Role: {response['user']['role']}")
            else:
                self.log_test("Agent Login", False, str(response))

        # Test invalid login
        success, response = self.make_request('POST', 'auth/login', {
            "email": "invalid@test.com",
            "password": "wrongpassword"
        }, expected_status=401)
        self.log_test("Invalid Login Prevention", success and 'Invalid credentials' in response.get('detail', ''))

        return self.admin_token is not None

    def test_auth_me_endpoint(self):
        """Test the /auth/me endpoint"""
        if not self.admin_token:
            self.log_test("Auth Me Test", False, "No admin token available")
            return False

        success, response = self.make_request('GET', 'auth/me', token=self.admin_token)
        self.log_test("Auth Me Endpoint", success and 'email' in response and 'role' in response)
        return success

    def test_guide_management(self):
        """Test guide creation and retrieval"""
        if not self.admin_token:
            self.log_test("Guide Management", False, "No admin token available")
            return False

        # Create a guide
        guide_data = {
            "slug": f"test-guide-{datetime.now().strftime('%H%M%S')}",
            "title": "Test Guide for API Testing",
            "category": "testing",
            "tags": ["test", "api"]
        }

        success, response = self.make_request('POST', 'guides', guide_data, token=self.admin_token)
        if success and 'id' in response:
            guide_id = response['id']
            self.created_resources['guides'].append(guide_id)
            self.log_test("Guide Creation", True, f"Guide ID: {guide_id}")
        else:
            self.log_test("Guide Creation", False, str(response))
            return False

        # Get all guides
        success, response = self.make_request('GET', 'guides', token=self.admin_token)
        self.log_test("Get All Guides", success and isinstance(response, list))

        # Get specific guide
        success, response = self.make_request('GET', f'guides/{guide_id}', token=self.admin_token)
        self.log_test("Get Specific Guide", success and response.get('id') == guide_id)

        # Test unauthorized guide creation (without admin token)
        success, response = self.make_request('POST', 'guides', guide_data, token=self.agent_token, expected_status=403)
        self.log_test("Unauthorized Guide Creation Prevention", success)

        return len(self.created_resources['guides']) > 0

    def test_guide_versions(self):
        """Test guide version management"""
        if not self.created_resources['guides'] or not self.admin_token:
            self.log_test("Guide Versions", False, "No guides or admin token available")
            return False

        guide_id = self.created_resources['guides'][0]
        
        # Create a guide version
        version_data = {
            "graph": {
                "nodes": [
                    {"id": "start", "type": "start", "data": {"label": "Start"}},
                    {"id": "step1", "type": "question", "data": {"label": "Question 1"}}
                ],
                "edges": [
                    {"id": "e1", "source": "start", "target": "step1"}
                ]
            },
            "crm_note_template": "Customer completed test flow"
        }

        success, response = self.make_request('POST', f'guides/{guide_id}/versions', version_data, token=self.admin_token)
        if success and 'id' in response:
            version_id = response['id']
            self.log_test("Guide Version Creation", True, f"Version ID: {version_id}")
            
            # Get the version
            success, response = self.make_request('GET', f'guides/{guide_id}/versions/{version_id}', token=self.admin_token)
            self.log_test("Get Guide Version", success and response.get('id') == version_id)
            return True
        else:
            self.log_test("Guide Version Creation", False, str(response))
            return False

    def test_session_management(self):
        """Test session creation and management"""
        # Create a session (no auth required for basic session creation)
        session_data = {
            "role": "customer",
            "guide_version_id": "test-version-id",
            "locale": "en"
        }

        success, response = self.make_request('POST', 'sessions', session_data)
        if success and 'id' in response:
            session_id = response['id']
            self.created_resources['sessions'].append(session_id)
            self.log_test("Session Creation", True, f"Session ID: {session_id}")
        else:
            self.log_test("Session Creation", False, str(response))
            return False

        # Get session
        success, response = self.make_request('GET', f'sessions/{session_id}')
        self.log_test("Get Session", success and response.get('id') == session_id)

        # Update customer context
        context_data = {"name": "Test Customer", "email": "test@example.com"}
        success, response = self.make_request('PATCH', f'sessions/{session_id}/customer-context', context_data)
        self.log_test("Update Customer Context", success)

        # Update CRM context
        crm_data = {"notes": "Customer inquiry about product", "priority": "high"}
        success, response = self.make_request('PATCH', f'sessions/{session_id}/crm-context', crm_data)
        self.log_test("Update CRM Context", success)

        # Complete session
        success, response = self.make_request('POST', f'sessions/{session_id}/complete')
        self.log_test("Complete Session", success)

        return len(self.created_resources['sessions']) > 0

    def test_event_tracking(self):
        """Test event logging"""
        if not self.created_resources['sessions']:
            self.log_test("Event Tracking", False, "No sessions available")
            return False

        session_id = self.created_resources['sessions'][0]
        event_data = {
            "session_id": session_id,
            "step_id": "step1",
            "action": "step_viewed",
            "props": {"timestamp": datetime.now().isoformat()}
        }

        success, response = self.make_request('POST', 'events', event_data)
        self.log_test("Event Logging", success and 'id' in response)
        return success

    def test_escalation_system(self):
        """Test escalation creation"""
        if not self.created_resources['sessions']:
            self.log_test("Escalation System", False, "No sessions available")
            return False

        session_id = self.created_resources['sessions'][0]
        escalation_data = {
            "session_id": session_id,
            "guide_id": "test-guide-id",
            "step_id": "step1",
            "category": "technical",
            "message": "Customer needs help with this step",
            "contact": {"email": "customer@test.com", "name": "Test Customer"}
        }

        success, response = self.make_request('POST', 'escalations', escalation_data)
        if success and 'id' in response:
            self.created_resources['escalations'].append(response['id'])
            self.log_test("Escalation Creation", True)
        else:
            self.log_test("Escalation Creation", False, str(response))
        return success

    def test_analytics_endpoints(self):
        """Test analytics endpoints (admin only)"""
        if not self.admin_token:
            self.log_test("Analytics", False, "No admin token available")
            return False

        # Test analytics overview
        success, response = self.make_request('GET', 'admin/analytics/overview', token=self.admin_token)
        expected_keys = ['total_sessions', 'completed_sessions', 'completion_rate', 'total_escalations', 'escalation_rate']
        has_all_keys = all(key in response for key in expected_keys)
        self.log_test("Analytics Overview", success and has_all_keys)

        # Test sessions analytics
        success, response = self.make_request('GET', 'admin/analytics/sessions', token=self.admin_token)
        self.log_test("Sessions Analytics", success and isinstance(response, list))

        # Test unauthorized access
        success, response = self.make_request('GET', 'admin/analytics/overview', token=self.agent_token, expected_status=403)
        self.log_test("Analytics Unauthorized Access Prevention", success)

        return True

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Guided Flow Platform Backend API Tests")
        print("=" * 60)

        # Test sequence
        tests = [
            ("Health Check", self.test_health_check),
            ("User Registration", self.test_user_registration),
            ("User Login", self.test_user_login),
            ("Auth Me Endpoint", self.test_auth_me_endpoint),
            ("Guide Management", self.test_guide_management),
            ("Guide Versions", self.test_guide_versions),
            ("Session Management", self.test_session_management),
            ("Event Tracking", self.test_event_tracking),
            ("Escalation System", self.test_escalation_system),
            ("Analytics Endpoints", self.test_analytics_endpoints)
        ]

        print(f"\n📋 Running {len(tests)} test suites...")
        
        for test_name, test_func in tests:
            print(f"\n🔍 Testing {test_name}...")
            try:
                test_func()
            except Exception as e:
                self.log_test(f"{test_name} (Exception)", False, str(e))

        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    """Main test runner"""
    # Use the backend URL from environment or default
    backend_url = "http://localhost:8001"  # Will be updated with actual public URL
    
    print(f"🌐 Testing backend at: {backend_url}")
    
    tester = GuidedFlowAPITester(backend_url)
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())