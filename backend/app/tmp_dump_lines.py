path=r'f:\\base44-fetch-mirror\\DeepFake\\backend\\app\\routes\\media.py'
with open(path,'r',encoding='utf-8') as f:
    lines=f.readlines()
for i in range(1396, 1410):
    print(i+1, repr(lines[i]))
