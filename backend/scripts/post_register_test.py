import json
import sys

payload={
  "file_url":"https://example.com/img.png",
  "file_name":"img.png",
  "file_type":"image/png",
  "sha256_hash":"0x" + "a"*64,
  "perceptual_hash":"phash",
  "ipfs_cid":"QmTestCid",
  "ai_model":"test-model",
  "generation_time":"2025-11-10T12:00:00Z",
  "notes":"test via automated e2e",
  "algo_tx":"4XHGJDVCALIFBIGM7QSMYO5GB37LTFUN6NYPVMZTEPYYMJ46XVJQ",
  "algo_explorer_url":"https://lora.algokit.io/testnet/transaction/4XHGJDVCALIFBIGM7QSMYO5GB37LTFUN6NYPVMZTEPYYMJ46XVJQ",
  "signer_address":"AUB2TR2B37Q3245NHZA2D5SPCQ4BUDQHIY4E7BLJJYXTX2QJI5U6I5L73U"
}

url = 'http://127.0.0.1:8011/media/register'

# Try requests first
try:
    import requests
    r = requests.post(url, json=payload, timeout=30)
    print('STATUS', r.status_code)
    print('HEADERS', r.headers)
    print('BODY')
    print(r.text)
    sys.exit(0 if r.status_code<400 else 2)
except Exception as e:
    print('requests failed:', e)

# Fallback to urllib
try:
    from urllib import request as ur
    req = ur.Request(url, data=json.dumps(payload).encode('utf-8'), headers={ 'Content-Type':'application/json' })
    with ur.urlopen(req, timeout=30) as resp:
        print('STATUS', resp.status)
        print('BODY')
        print(resp.read().decode('utf-8'))
except Exception as e2:
    print('urllib failed:', e2)
    sys.exit(3)
