#!/usr/bin/env python3
"""
Send a test payment using DEPLOYER_MNEMONIC and then POST a minimal registration
payload including the resulting txid to the local backend `/media/register_debug`.

This is a dev helper to reproduce registration errors end-to-end and capture full
tracebacks from the server (register_debug returns full traceback on error).
"""
import os
import time
import json
import hashlib
import sys
from algosdk import mnemonic, account
try:
    from app.config import settings
except Exception:
    # fallback to .env if necessary
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
    settings = None
from algosdk.v2client import algod
from algosdk.future.transaction import PaymentTxn


def get_env(name):
    if settings:
        return getattr(settings, name, None)
    return os.getenv(name)


def main():
    mn = get_env('DEPLOYER_MNEMONIC')
    if not mn:
        print('DEPLOYER_MNEMONIC not found; aborting', file=sys.stderr)
        sys.exit(1)
    mn = mn.replace('"','').strip()
    priv = mnemonic.to_private_key(mn)
    sender = account.address_from_private_key(priv)

    ALGOD_ADDRESS = get_env('ALGOD_ADDRESS') or get_env('ALGOD_URL')
    ALGOD_TOKEN = get_env('ALGOD_TOKEN')
    if not ALGOD_ADDRESS:
        print('ALGOD_ADDRESS not set; aborting', file=sys.stderr)
        sys.exit(1)

    algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

    TO_ADDR = os.getenv('TEST_RECEIVER') or 'AUB2TR2B37Q3245NHZA2D5SPCQ4BUDQHIY4E7BLJJYXTX2QJI5U6I5L73U'
    AMOUNT = 10000

    print('Sender:', sender)
    print('Receiver:', TO_ADDR)

    params = algod_client.suggested_params()
    txn = PaymentTxn(sender, params, TO_ADDR, AMOUNT)
    signed = txn.sign(priv)
    try:
        txid = algod_client.send_transaction(signed)
        print('txid:', txid)
    except Exception as e:
        print('Failed to send transaction:', e, file=sys.stderr)
        sys.exit(1)

    # wait for confirmation (short loop)
    for i in range(20):
        try:
            info = algod_client.pending_transaction_info(txid)
            confirmed_round = info.get('confirmed-round') or info.get('confirmed_round')
            if confirmed_round and int(confirmed_round) > 0:
                print('Transaction confirmed in round', confirmed_round)
                break
        except Exception:
            pass
        time.sleep(1)

    explorer_url = f'https://lora.algokit.io/testnet/transaction/{txid}'
    print('Explorer URL:', explorer_url)

    # Build minimal registration payload
    # Create a deterministic sha256 for the file bytes 'dev-test'
    h = hashlib.sha256(b'dev-test').hexdigest()
    payload = {
        'file_url': 'https://example.com/dev-test.png',
        'file_name': 'dev-test.png',
        'file_type': 'image/png',
        'sha256_hash': h,
        'perceptual_hash': None,
        'ipfs_cid': None,
        'ai_model': 'TestModel',
        'generation_time': None,
        'notes': 'Automated test registration',
        'algo_tx': txid,
        'algo_explorer_url': explorer_url,
        # Use receiver as signer_address to simulate a client wallet address
        'signer_address': TO_ADDR,
        'metadata_signature': None,
    }

    # POST to register_debug to get full traceback if server errors
    import requests
    url = 'http://127.0.0.1:8011/media/register_debug'
    try:
        r = requests.post(url, json=payload, timeout=30)
        print('Register response status:', r.status_code)
        try:
            print(r.json())
        except Exception:
            print(r.text)
    except Exception as e:
        print('Failed to POST registration:', e, file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
