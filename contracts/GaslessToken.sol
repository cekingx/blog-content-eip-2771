// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract GaslessToken is ERC2771Context, ERC20 {
    constructor(string memory name, string memory symbol, address trustedForwarder)
        ERC20(name, symbol)
        ERC2771Context(trustedForwarder) {}

    function _msgSender() internal override(Context, ERC2771Context) view returns (address) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal override(Context, ERC2771Context) view returns (bytes calldata) {
        return ERC2771Context._msgData();
    }

    function mint() external {
        _mint(_msgSender(), 10 * decimals());
    }

    function mint(uint256 amount) external {
        _mint(_msgSender(), amount);
    }
}
