import ast, sys
path=r'f:\\base44-fetch-mirror\\DeepFake\\backend\\app\\routes\\media.py'
with open(path,'r',encoding='utf-8') as f:
    src=f.read()
try:
    tree=ast.parse(src)
except SyntaxError as e:
    print('SYNTAX', e.lineno, e.offset)
    lines=src.splitlines()
    for i in range(max(0,e.lineno-5), min(len(lines), e.lineno+5)):
        print(i+1, lines[i])
    sys.exit(1)
for node in ast.walk(tree):
    if isinstance(node, ast.Try):
        handlers=len(node.handlers)
        final=bool(node.finalbody)
        print('TRY', node.lineno, 'handlers=', handlers, 'final=', final)
print('OK')
