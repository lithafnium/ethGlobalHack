// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.7.0 <0.9.0;

import {Enum} from "../../common/Enum.sol";
import {BaseGuard} from "../../base/GuardManager.sol";
// import "@chainlink/contracts/src/v0.7.1/ChainlinkClient.sol";
import "../../../node_modules/@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "../../../node_modules/@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

contract ReentrancyTransactionGuard is BaseGuard, ChainlinkClient, ConfirmedOwner {
    
    using Chainlink for Chainlink.Request;
    bytes32 private jobId;
    uint256 private fee;

    event RequestMalicious(bytes32 indexed requestId, string malicious);

    constructor() ConfirmedOwner(msg.sender) {
        // TODO: change this
        setChainlinkToken(0x779877A7B0D9E8603169DdbD7836e478b4624789);
        setChainlinkOracle(0x6090149792dAAeE9D1D568c9f9a6F6B46AA29eFD);
        jobId = "7d80a6386ef543a3abb52817f6707e3b";
        fee = (1 * LINK_DIVISIBILITY) / 10;
    }

    fallback() external {
    }

    function requestRiskScore(string memory targetAddress) public returns (bytes32 requestId) {

        Chainlink.Request memory req = buildChainlinkRequest(
            jobId,
            address(this),
            this.fulfill.selector
        );
        req.add(
            "get",
            string.concat("https://opcodes.crtsn.com/predict?targetAddress=", targetAddress) 
        );
        req.add(
            "path",
            "body"
        );
        return sendChainlinkRequest(req, fee);
    }

    function fulfill(
        bytes32 _requestId,
        string memory _malicious
    ) public recordChainlinkFulfillment(_requestId) {
        emit RequestMalicious(_requestId, _malicious);
        bytes memory _maliciousBytes = bytes(_malicious);
        // Check to see if returned example is maliicous
        if (_maliciousBytes[12] == 'M') {
            revert();
        }
    }

    /**
     * @notice Called by the Safe contract before a transaction is executed.
     * @dev Reverts if malicious contract is detected.
     */
    function checkTransaction(
        address to,
        uint256,
        bytes memory,
        Enum.Operation,
        uint256,
        uint256,
        uint256,
        address,
        // solhint-disable-next-line no-unused-vars
        address payable,
        bytes memory,
        address
    ) external override {
        // Call API here and get response        
        requestRiskScore(to);
    }

    function checkAfterExecution(bytes32 txHash, bool success) external override {}

    /**
     * @notice Called by the Safe contract before a transaction is executed via a module.
     * @param to Destination address of Safe transaction.
     * @param value Ether value of Safe transaction.
     * @param data Data payload of Safe transaction.
     * @param operation Operation type of Safe transaction.
     * @param module Account executing the transaction.
     */
    function checkModuleTransaction(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation,
        address module
    ) external override returns (bytes32 moduleTxHash) {
        // Call API here and get response        
        requestRiskScore(to);
    }

}