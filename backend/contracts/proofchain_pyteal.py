from pyteal import *

"""
ProofChain v2 PyTeal Contract

A simplified version to test core compilation.
"""

def approval_program():
    
    on_creation = Seq([
        Approve(),
    ])

    # This is a simplified register function for testing compilation
    # On-chain key derivation and unique registration handling.
    # Expects app_args:
    #   [0] = Bytes("register")
    #   [1] = H (content preimage, e.g., sha256(file_bytes) as 32 raw bytes)
    #   [2] = value to store under the media key (e.g., IPFS CID or packed metadata)
    #   [3] = optional nonce (e.g., txid or random salt) for unique per-submission registrations
    # Behavior:
    #   - Compute media_key = sha256(H) on-chain. If the box doesn't exist, create and store value.
    #   - Compute reg_key = sha256(media_key || nonce) where nonce is app_args[3] if provided,
    #     else a fallback derived from (sender || round) to ensure uniqueness.
    #   - Create reg_key box if missing and store Txn.sender() as the value.
    on_register = Seq([
        Assert(Or(Txn.application_args.length() == Int(3), Txn.application_args.length() == Int(4))),

        # Derive media_key on-chain so Algorand generates the key
        (media_key := ScratchVar(TealType.bytes)).store(Sha256(Txn.application_args[1])),

        # Ensure media box exists and stores provided value (CID/metadata)
        (media_exists := App.box_get(media_key.load())),
        If(
            media_exists.hasValue(),
            Approve(),
            Seq(
                Pop(App.box_create(media_key.load(), Len(Txn.application_args[2]))),
                App.box_put(media_key.load(), Txn.application_args[2]),
                Approve(),
            ),
        ),

        # Determine nonce: app_args[3] if present, else (sender || round)
        (nonce := ScratchVar(TealType.bytes)).store(
            If(
                Txn.application_args.length() == Int(4),
                Txn.application_args[3],
                Concat(Txn.sender(), Itob(Global.round()))
            )
        ),

        # Compute a unique per-submission registration key
        (reg_key := ScratchVar(TealType.bytes)).store(Sha256(Concat(media_key.load(), nonce.load()))),

        # Create registration record if missing; store the submitter's address
        (reg_exists := App.box_get(reg_key.load())),
        If(
            reg_exists.hasValue(),
            Approve(),
            Seq(
                Pop(App.box_create(reg_key.load(), Int(32))),
                App.box_put(reg_key.load(), Txn.sender()),
                Approve(),
            ),
        ),
    ])

    # --- Actions ---
    ACTION_REGISTER = Bytes("register")
    ACTION_VERIFY = Bytes("verify")

    # --- Main Routing ---
    @Subroutine(TealType.uint64)
    def handle_noop():
        # The router for different actions
        Assert(Txn.application_args.length() > Int(0))
        action = Txn.application_args[0]

        # --- Action Router ---
        return Cond(
            [action == ACTION_REGISTER, register_user()],
            [action == ACTION_VERIFY, verify_content()]
        )

    @Subroutine(TealType.uint64)
    def register_user():
        # A user "registers" by creating a box named after their own address
        # and storing their public key in it.
        # Expects: app_args[1] = public_key (32 bytes)
        Assert(Txn.application_args.length() == Int(2))
        
        user_address = Txn.sender()
        public_key = Txn.application_args[1]
        
        # The box is named after the user's address to ensure one box per user.
        box_name = user_address 
        
        return Seq(
            # Check if a box for this user already exists.
            (box_exists := App.box_get(box_name)),
            If(box_exists.hasValue(),
               # User is already registered.
               Approve(),
               # User is not registered, create a new box for them.
               Seq(
                   # Allocate 64 bytes for the box. (e.g., 32 for key, 32 for other data)
                   Pop(App.box_create(box_name, Int(64))),
                   # Store the user's public key in the box.
                   App.box_put(box_name, public_key),
                   Approve()
               )
            )
        )

    @Subroutine(TealType.uint64)
    def verify_content():
        # Creates a proof record for a piece of content.
        # Expects:
        #   app_args[1] = sha256_hash (32 bytes)
        #   app_args[2] = ipfs_cid (e.g., 46 bytes for v0)
        Assert(Txn.application_args.length() == Int(3))

        content_hash = Txn.application_args[1]
        ipfs_cid = Txn.application_args[2]
        verifier_address = Txn.sender()

        # Use the content hash as the unique name for the box.
        box_name = content_hash
        
        # The value stored will be the IPFS CID concatenated with the verifier's address.
        # IPFS CID (e.g., 46 bytes) + Verifier Address (32 bytes) = 78 bytes
        box_value = Concat(ipfs_cid, verifier_address)
        box_size = Len(box_value)

        return Seq(
            # Check if a proof for this content already exists.
            (box_exists := App.box_get(box_name)),
            If(box_exists.hasValue(),
               # Content already verified.
               Approve(),
               # Content not yet verified, create a new proof box.
               Seq(
                   Pop(App.box_create(box_name, box_size)),
                   App.box_put(box_name, box_value),
                   Approve()
               )
            )
        )

    # --- Program Entrypoint ---
    program = Cond(
        [Txn.application_id() == Int(0), on_creation],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Txn.sender() == Global.creator_address())],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(Txn.sender() == Global.creator_address())],
        [Txn.application_args[0] == Bytes("register"), on_register]
    )

    return program

def clear_state_program():
    return Approve()
