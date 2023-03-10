import requests

# POST request
url = 'http://localhost:8020/api/v2/sample/v3/AHOJ/post'

# send some data
headers = {'Content-Type': 'multipart/form-data'}

# send the request
r = requests.post(url, headers=headers, json={"identifier": "AHOJ"})

# print the response
print(r.text)