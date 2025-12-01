from algosdk.future.transaction import ApplicationCreateTxn, OnComplete
from algosdk.v2client import algod
from algosdk import account, mnemonic
from pyteal import compileTeal, Mode
from proofchain_pyteal import approval_program, clear_state_program

# User-defined variables
ALGOD_ADDRESS = "http://localhost:4001"  # Update with your Algorand node address
ALGOD_TOKEN = "<algod-token>"  # Update with your Algorand node token
CREATOR_MNEMONIC = "<your-25-word-mnemonic>"  # Update with your mnemonic

# Helper function to compile PyTeal to TEAL
def compile_program(client, program_source):
    compile_response = client.compile(program_source)
    return compile_response["result"].encode()

# Deploy the contract
def deploy_contract():
    # Initialize the Algorand client
    algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

    # Recover the creator account
    creator_private_key = mnemonic.to_private_key(CREATOR_MNEMONIC)
    creator_address = account.address_from_private_key(creator_private_key)

    # Compile the PyTeal programs
    approval_teal = compileTeal(approval_program(), mode=Mode.Application, version=6)
    clear_state_teal = compileTeal(clear_state_program(), mode=Mode.Application, version=6)

    approval_program_compiled = compile_program(algod_client, approval_teal)
    clear_state_program_compiled = compile_program(algod_client, clear_state_teal)

    # Get suggested transaction parameters
    params = algod_client.suggested_params()

    # Create the application creation transaction
    txn = ApplicationCreateTxn(
        sender=creator_address,
        sp=params,
        on_complete=OnComplete.NoOpOC,
        approval_program=approval_program_compiled,
        clear_program=clear_state_program_compiled,
        global_schema=None,  # Define global schema if needed
        local_schema=None,  # Define local schema if needed
        app_args=None  # Pass application arguments if needed
    )

    # Sign the transaction
    signed_txn = txn.sign(creator_private_key)

    # Send the transaction
    tx_id = algod_client.send_transaction(signed_txn)
    print(f"Transaction ID: {tx_id}")

    # Wait for confirmation
    try:
        confirmed_txn = algod_client.pending_transaction_info(tx_id)
        print("Transaction confirmed in round", confirmed_txn.get("confirmed-round", "Pending"))
        print("Application ID:", confirmed_txn["application-index"])
    except Exception as e:
        print("Error during deployment:", e)

if __name__ == "__main__":
    deploy_contract()