import requests

response = requests.get("http://localhost:11434/api/tags")

print(response.status_code)
print(response.json())
