#!/usr/bin/env python3
"""
Простые тесты API эндпоинтов VitaWin без авторизации
"""

import requests
import json
import urllib3

# Отключаем SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://vitawins.ru"

def test_api_endpoints():
    """Тестируем основные публичные эндпоинты"""
    
    session = requests.Session()
    session.verify = False
    
    # Список тестов без авторизации
    tests = [
        {
            "name": "Health Check",
            "method": "GET",
            "url": "/health",
            "expected": 200
        },
        {
            "name": "Get Products",
            "method": "GET", 
            "url": "/api/products?limit=5",
            "expected": 200
        },
        {
            "name": "Get Specific Product",
            "method": "GET",
            "url": "/api/product/18",
            "expected": [200, 404]
        },
        {
            "name": "Get Blog Posts",
            "method": "GET",
            "url": "/api/blog?limit=5", 
            "expected": 200
        },
        {
            "name": "Get Site Scripts",
            "method": "GET",
            "url": "/api/site-scripts",
            "expected": 200
        },
        {
            "name": "Get Cart (Guest)",
            "method": "GET",
            "url": "/api/cart",
            "expected": 200
        },
        {
            "name": "Add to Cart (Guest)",
            "method": "POST",
            "url": "/api/cart",
            "data": {"product_id": 18, "quantity": 1},
            "expected": [200, 400]
        },
        {
            "name": "Get User by Telegram ID",
            "method": "GET",
            "url": "/api/user/telegram/1622907369",
            "expected": [200, 404]
        },
        {
            "name": "Get MLM Levels",
            "method": "GET",
            "url": "/api/mlm/levels",
            "expected": 200
        }
    ]
    
    results = {"passed": 0, "failed": 0, "total": len(tests)}
    
    print(f"🚀 Тестирование {len(tests)} API эндпоинтов")
    print(f"🌐 Сервер: {BASE_URL}")
    print("-" * 50)
    
    for test in tests:
        try:
            url = BASE_URL + test["url"]
            
            if test["method"] == "GET":
                response = session.get(url, timeout=10)
            elif test["method"] == "POST":
                response = session.post(url, json=test.get("data"), timeout=10)
            else:
                print(f"❌ {test['name']}: Неподдерживаемый метод {test['method']}")
                results["failed"] += 1
                continue
                
            expected = test["expected"]
            if isinstance(expected, list):
                success = response.status_code in expected
            else:
                success = response.status_code == expected
                
            if success:
                print(f"✅ {test['name']}: {response.status_code}")
                results["passed"] += 1
                
                # Дополнительные проверки для JSON ответов
                if response.status_code == 200 and 'application/json' in response.headers.get('content-type', ''):
                    try:
                        data = response.json()
                        if "success" in data and not data["success"]:
                            print(f"   ⚠️  Предупреждение: success=false в ответе")
                    except json.JSONDecodeError:
                        pass
                        
            else:
                print(f"❌ {test['name']}: Ожидался {expected}, получен {response.status_code}")
                print(f"   Ответ: {response.text[:100]}...")
                results["failed"] += 1
                
        except requests.exceptions.RequestException as e:
            print(f"❌ {test['name']}: Ошибка сети - {e}")
            results["failed"] += 1
        except Exception as e:
            print(f"❌ {test['name']}: Неожиданная ошибка - {e}")
            results["failed"] += 1
    
    print("-" * 50)
    print(f"📊 Результаты тестирования:")
    print(f"   ✅ Прошло: {results['passed']}")
    print(f"   ❌ Не прошло: {results['failed']}")
    print(f"   📈 Процент успеха: {(results['passed'] / results['total'] * 100):.1f}%")
    
    if results["failed"] == 0:
        print("🎉 Все тесты прошли успешно!")
    else:
        print(f"⚠️  {results['failed']} тестов не прошли")
    
    return results

if __name__ == "__main__":
    test_api_endpoints()