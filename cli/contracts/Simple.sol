// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

contract Simple {
    // Define a mapping to store user balances
    mapping(address => uint256) public balances;

    // Define an event to log balance updates
    event BalanceUpdated(address indexed user, uint256 newBalance);

    // Define a modifier to check if the sender is the owner
    modifier onlyOwner() {
        require(msg.sender == owner(), "Only the owner can perform this action");
        _;
    }

    // Define a modifier to check if the sender is the owner or the user
    modifier onlyOwnerOrUser() {
        require(msg.sender == owner() || msg.sender == tx.origin, "Only the owner or the user can perform this action");
        _;
    }

    // Define a variable to store the owner's address
    address private owner;

    // Define a constructor to initialize the owner's address
    constructor() {
        owner = msg.sender;
    }

    // Define a function to get the owner's address
    function owner() public view returns (address) {
        return owner;
    }

    // Define a function to deposit funds
    /**
     * @dev Deposits funds into the contract.
     * @param _amount The amount to deposit.
     */
    function deposit(uint256 _amount) public {
        // Check if the amount is valid
        require(_amount > 0, "Invalid deposit amount");

        // Update the user's balance
        balances[msg.sender] += _amount;

        // Emit an event to log the balance update
        emit BalanceUpdated(msg.sender, balances[msg.sender]);
    }

    // Define a function to withdraw funds
    /**
     * @dev Withdraws funds from the contract.
     * @param _amount The amount to withdraw.
     */
    function withdraw(uint256 _amount) public onlyOwnerOrUser {
        // Check if the amount is valid
        require(_amount > 0, "Invalid withdrawal amount");

        // Check if the user has sufficient balance
        require(balances[msg.sender] >= _amount, "Insufficient balance");

        // Update the user's balance
        balances[msg.sender] -= _amount;

        // Emit an event to log the balance update
        emit BalanceUpdated(msg.sender, balances[msg.sender]);
    }

    // Define a function to get the user's balance
    /**
     * @dev Gets the user's balance.
     * @param _user The user's address.
     * @return The user's balance.
     */
    function getBalance(address _user) public view returns (uint256) {
        return balances[_user];
    }
}