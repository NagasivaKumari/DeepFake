import os
import time
from algosdk import mnemonic, account
# Use backend config which already loads environment from backend/.env
try:
    from app.config import settings
except Exception:
    # fallback to dotenv if import fails
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
    settings = None
from algosdk.v2client import algod
from algosdk.future.transaction import PaymentTxn

# Load settings from environment (require DEPLOYER_MNEMONIC)
if settings:
    mn = getattr(settings, 'DEPLOYER_MNEMONIC', None)
    ALGOD_ADDRESS = getattr(settings, 'ALGOD_ADDRESS', None) or getattr(settings, 'ALGOD_URL', None)
    ALGOD_TOKEN = getattr(settings, 'ALGOD_TOKEN', None)
else:
    mn = os.getenv('DEPLOYER_MNEMONIC')
    ALGOD_ADDRESS = os.getenv('ALGOD_ADDRESS') or os.getenv('ALGOD_URL')
    ALGOD_TOKEN = os.getenv('ALGOD_TOKEN')

if not mn:
    raise SystemExit('DEPLOYER_MNEMONIC not found in environment; set DEPLOYER_MNEMONIC in backend/.env or your shell')
mn = mn.replace('"','').strip()
priv = mnemonic.to_private_key(mn)
sender = account.address_from_private_key(priv)

if not ALGOD_ADDRESS:
    raise SystemExit('ALGOD_ADDRESS must be set in environment (backend/.env)')

algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

# Destination: use the signer address you provided earlier; change here if needed
TO_ADDR = os.getenv('TEST_RECEIVER') or 'AUB2TR2B37Q3245NHZA2D5SPCQ4BUDQHIY4E7BLJJYXTX2QJI5U6I5L73U'
AMOUNT = 10000  # microAlgos (0.01 ALGO)

print('Sender:', sender)
print('Receiver:', TO_ADDR)

# Build and send txn
params = algod_client.suggested_params()
print('Suggested params fetched: first', getattr(params, 'first', None))

txn = PaymentTxn(sender, params, TO_ADDR, AMOUNT)
signed = txn.sign(priv)
try:
    txid = algod_client.send_transaction(signed)
    print('txid:', txid)
except Exception as e:
    raise SystemExit('Failed to send transaction: %s' % e)

# Wait for confirmation (poll)
for i in range(30):
    try:
        info = algod_client.pending_transaction_info(txid)
        confirmed_round = info.get('confirmed-round') or info.get('confirmed_round')
        if confirmed_round and int(confirmed_round) > 0:
            print('Transaction confirmed in round', confirmed_round)
            break
    except Exception as e:
        pass
    time.sleep(2)
else:
    print('No confirmation yet (still pending)')

print('Explorer URL:', f'https://lora.algokit.io/testnet/transaction/{txid}')
print('Done')
