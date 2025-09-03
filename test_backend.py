#!/usr/bin/env python3
"""
Test script para diagnosticar el error en get_all_agents
"""

import requests
import json

# URL del endpoint
ENDPOINT_URL = "https://us-central1-positive-hub-ai.cloudfunctions.net/get_all_agents"

# Token de prueba (puedes obtenerlo del browser)
TEST_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjlmOWY4OTBmYWIyZDAwOWNhNTVmZDJiOGI3NzZhYzFhY2JjMTM2NzgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vcG9zaXRpdmUtaHViLWFpIiwiYXVkIjoicG9zaXRpdmUtaHViLWFpIiwiYXV0aF90aW1lIjoxNzM1OTQyNzA2LCJ1c2VyX2lkIjoibVo3RXpQVklKemdpYnpPcWxnQXJoRXZmOW1MMiIsInN1YiI6Im1aN0V6UFZJSnpnaWJ6T3FsZ0FyaEV2ZjltTDIiLCJpYXQiOjE3MzU5NDI3MDYsImV4cCI6MTczNTk0NjMwNiwiZW1haWwiOiJlbmFyZGVsbGlAcG9zaXRpdmVpdC5jb20uYXIiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJnb29nbGUuY29tIjpbIjEwMTc2ODUxNzIwOTkyMjcxNDQ5NyJdLCJlbWFpbCI6WyJlbmFyZGVsbGlAcG9zaXRpdmVpdC5jb20uYXIiXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19"

def test_endpoint():
    """Test the get_all_agents endpoint directly"""
    
    print("🔍 Testing get_all_agents endpoint...")
    print(f"📡 URL: {ENDPOINT_URL}")
    
    headers = {
        'Authorization': f'Bearer {TEST_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(ENDPOINT_URL, headers=headers, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📋 Headers: {dict(response.headers)}")
        
        try:
            data = response.json()
            print(f"📄 Response Body:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        except json.JSONDecodeError:
            print(f"📄 Raw Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request Error: {e}")
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")

def test_without_auth():
    """Test without authentication to see different behavior"""
    
    print("\n🔍 Testing without authentication...")
    
    try:
        response = requests.get(ENDPOINT_URL, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        
        try:
            data = response.json()
            print(f"📄 Response Body:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        except json.JSONDecodeError:
            print(f"📄 Raw Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🚀 Backend Endpoint Test")
    print("=" * 50)
    
    test_without_auth()
    test_endpoint()
    
    print("\n" + "=" * 50)
    print("🏁 Test Complete!")
