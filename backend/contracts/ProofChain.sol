// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ProofChain {
    struct Record {
        address owner;
        bytes32 sha256hash;
        string ipfsCid;
        string metadataUri;
        uint256 timestamp;
        bool revoked;
    }

    mapping(bytes32 => Record) public records;

    event Registered(bytes32 indexed hash, address indexed owner, string cid, string meta, uint256 time);
    event Revoked(bytes32 indexed hash, address indexed owner);

    function register(bytes32 _hash, string calldata _cid, string calldata _meta) external {
        require(records[_hash].timestamp == 0, "Already registered");
        records[_hash] = Record(msg.sender, _hash, _cid, _meta, block.timestamp, false);
        emit Registered(_hash, msg.sender, _cid, _meta, block.timestamp);
    }

    function revoke(bytes32 _hash) external {
        Record storage r = records[_hash];
        require(r.owner == msg.sender, "Not owner");
        r.revoked = true;
        emit Revoked(_hash, msg.sender);
    }

    function verify(bytes32 _hash) external view returns (bool, Record memory) {
        Record memory r = records[_hash];
        if (r.timestamp == 0 || r.revoked) return (false, r);
        return (true, r);
    }
}
