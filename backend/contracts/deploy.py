import os
import base64
from dotenv import load_dotenv
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk import transaction
from pyteal import compileTeal, Mode

import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
# Import the new, simplified contract
from contracts.proofchain_pyteal import approval_program, clear_state_program

def get_algod_client():
    load_dotenv()
    algod_address = os.getenv("ALGOD_ADDRESS")
    algod_token = os.getenv("ALGOD_TOKEN", "")
    headers = {"X-API-Key": algod_token}
    return algod.AlgodClient(algod_token, algod_address, headers)

def compile_program(client: algod.AlgodClient, source_code):
    compile_response = client.compile(source_code)
    return base64.b64decode(compile_response['result'])

def create_app(client: algod.AlgodClient, private_key, approval_prog, clear_prog):
    sender = account.address_from_private_key(private_key)
    params = client.suggested_params()

    # This contract version has no state, so schemas are empty
    global_schema = transaction.StateSchema(num_uints=0, num_byte_slices=0)
    local_schema = transaction.StateSchema(num_uints=0, num_byte_slices=0)

    txn = transaction.ApplicationCreateTxn(
        sender=sender,
        sp=params,
        on_complete=transaction.OnComplete.NoOpOC,
        approval_program=approval_prog,
        clear_program=clear_prog,
        global_schema=global_schema,
        local_schema=local_schema,
    )

    signed_txn = txn.sign(private_key)
    tx_id = signed_txn.transaction.get_txid()
    client.send_transactions([signed_txn])

    try:
        confirmed_txn = transaction.wait_for_confirmation(client, tx_id, 4)
        app_id = confirmed_txn["application-index"]
        print(f"SUCCESS! Deployed v2 app with APP_ID: {app_id}")
        return app_id
    except Exception as e:
        print(f"Error waiting for confirmation: {e}")
        return None

def main():
    print("--- Starting ProofChain v2 Contract Deployment ---")
    algod_client = get_algod_client()

    load_dotenv()
    deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
    if not deployer_mnemonic:
        print("ERROR: DEPLOYER_MNEMONIC not set in .env file.")
        return

    private_key = mnemonic.to_private_key(deployer_mnemonic)
    sender_address = account.address_from_private_key(private_key)
    
    print(f"\nDeployer Address: {sender_address}")

    # --- Show balance before deployment ---
    account_info_before = algod_client.account_info(sender_address)
    balance_before = account_info_before.get('amount')
    print(f"Balance BEFORE deployment: {balance_before / 1_000_000} ALGO")

    print("\nCompiling contracts...")
    # NOTE: The contract name was changed back, so we import from the original name
    from contracts.proofchain_pyteal import approval_program, clear_state_program
    approval_source = compileTeal(approval_program(), mode=Mode.Application, version=8)
    clear_source = compileTeal(clear_state_program(), mode=Mode.Application, version=8)

    approval_compiled = compile_program(algod_client, approval_source)
    clear_compiled = compile_program(algod_client, clear_source)

    print("Deploying application...")
    app_id = create_app(algod_client, private_key, approval_compiled, clear_compiled)

    if app_id:
        # --- Show balance after deployment ---
        account_info_after = algod_client.account_info(sender_address)
        balance_after = account_info_after.get('amount')
        print(f"Balance AFTER deployment:  {balance_after / 1_000_000} ALGO")
        print(f"Fee Paid: {(balance_before - balance_after) / 1_000_000} ALGO")

if __name__ == "__main__":
    main()
