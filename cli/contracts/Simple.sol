// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Simple {
    // Mapping to store the counter value for each user
    mapping(address => uint256) public counter;

    // Event emitted when the counter value is updated
    event CounterUpdated(address indexed user, uint256 newValue);

    // Modifier to check if the user has a valid counter value
    modifier hasCounter() {
        require(counter[msg.sender] > 0, "User does not have a valid counter value");
        _;
    }

    // Modifier to check if the new value is greater than the current value
    modifier increment() {
        require(msg.sender == tx.origin, "Cannot be called from a contract");
        require(counter[msg.sender] < 1000, "Counter value is already at maximum");
        _;
    }

    // Function to initialize the counter value for a user
    function initializeCounter() public {
        counter[msg.sender] = 0;
    }

    // Function to increment the counter value for a user
    function incrementCounter() public hasCounter increment {
        counter[msg.sender]++;
        emit CounterUpdated(msg.sender, counter[msg.sender]);
    }

    // Function to get the current counter value for a user
    function getCounter() public view returns (uint256) {
        return counter[msg.sender];
    }

    // Function to reset the counter value for a user
    function resetCounter() public hasCounter {
        counter[msg.sender] = 0;
        emit CounterUpdated(msg.sender, counter[msg.sender]);
    }
}