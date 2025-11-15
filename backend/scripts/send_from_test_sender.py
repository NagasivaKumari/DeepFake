import os
import time
from pathlib import Path

# Try to use backend settings first (it loads .env)
try:
    from app.config import settings
except Exception:
    settings = None

from algosdk import mnemonic, account
from algosdk.v2client import algod
from algosdk.future.transaction import PaymentTxn

# Read DEPLOYER_MNEMONIC from environment (recommended to set in PowerShell session)
mn = os.getenv('DEPLOYER_MNEMONIC') or os.getenv('DEPLOYER_MNEMONIC')
if not mn:
    print('DEPLOYER_MNEMONIC is not set in the environment.\n\nSet it in PowerShell like:')
    print("$env:DEPLOYER_MNEMONIC = '<YOUR 25-word MNEMONIC>'")
    raise SystemExit(1)

mn = mn.replace('"', '').strip()
priv = mnemonic.to_private_key(mn)
sender = account.address_from_private_key(priv)

# Receiver (deployer) from backend settings or env
if settings:
    receiver = getattr(settings, 'DEPLOYER_ADDRESS', None) or getattr(settings, 'DEPLOYER_MNEMONIC', None)
else:
    receiver = os.getenv('DEPLOYER_ADDRESS') or os.getenv('DEPLOYER_MNEMONIC')

# If DEPLOYER_MNEMONIC provided instead of address, derive address
if receiver and len(receiver.split()) == 25:
    receiver = account.address_from_private_key(mnemonic.to_private_key(receiver.replace('"','').strip()))

if not receiver:
    print('Receiver (deployer) address not configured. Set DEPLOYER_ADDRESS in backend/.env or pass DEPLOYER_MNEMONIC.')
    raise SystemExit(1)

# Algod config
if settings:
    ALGOD_ADDRESS = getattr(settings, 'ALGOD_ADDRESS', None) or getattr(settings, 'ALGOD_URL', None)
    ALGOD_TOKEN = getattr(settings, 'ALGOD_TOKEN', None)
else:
    ALGOD_ADDRESS = os.getenv('ALGOD_ADDRESS') or os.getenv('ALGOD_URL')
    ALGOD_TOKEN = os.getenv('ALGOD_TOKEN')

if not ALGOD_ADDRESS:
    print('ALGOD_ADDRESS not configured in backend settings or environment.')
    raise SystemExit(1)

print('Sender:', sender)
print('Receiver:', receiver)
print('Algod:', ALGOD_ADDRESS)

algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

# Build txn
params = algod_client.suggested_params()
print('Suggested params fetched: first', getattr(params, 'first', None))

amount = 10000  # microAlgos
note = 'ProofChain test payment from DEPLOYER_MNEMONIC'

txn = PaymentTxn(sender, params, receiver, amount, None, note)
signed = txn.sign(priv)

try:
    txid = algod_client.send_transaction(signed)
    print('txid:', txid)
except Exception as e:
    print('Failed to send transaction:', e)
    raise SystemExit(1)

# Wait for confirmation
for i in range(30):
    try:
        info = algod_client.pending_transaction_info(txid)
        confirmed = info.get('confirmed-round') or info.get('confirmed_round')
        if confirmed and int(confirmed) > 0:
            print('Transaction confirmed in round', confirmed)
            break
    except Exception:
        pass
    time.sleep(2)
else:
    print('No confirmation yet')

print('Explorer URL:', f'https://lora.algokit.io/testnet/transaction/{txid}')
print('Done')
