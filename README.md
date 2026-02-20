# EIP-2771 Gasless Transaction Demo

A demo project showing how to implement gasless (meta-transaction) ERC20 token minting using [EIP-2771](https://eips.ethereum.org/EIPS/eip-2771).

## Overview

In a normal transaction, the user must hold ETH to pay for gas. With meta-transactions (EIP-2771), the user only signs a message off-chain, and a **relayer** submits the transaction and pays the gas on their behalf.

```
User (no ETH)        Relayer (has ETH)       Chain
     |                       |                   |
     |--- signs request ---> |                   |
     |    (off-chain)        |                   |
     |                       |--- forwarder  --> |
     |                       |    .execute()     |
     |                       |                   |--- mint() --> GaslessToken
     |                       |                   |    _msgSender() = user
```

## How It Works

1. **User** encodes the call they want to make (e.g. `mint(500)`) and signs it using EIP-712 typed data — no ETH required.
2. **Relayer** submits the signed request to `MinimalForwarder.execute()`, paying the gas.
3. **MinimalForwarder** verifies the signature and calls the target contract, appending the user's address to the calldata.
4. **GaslessToken** uses `ERC2771Context._msgSender()` to extract the original user's address from the tail of the calldata instead of reading `msg.sender` (which would be the forwarder).

## Contracts

### `GaslessToken`

An ERC20 token that supports meta-transactions by inheriting from both `ERC20` and `ERC2771Context`.

Both `ERC20` and `ERC2771Context` inherit from `Context` (diamond inheritance), so `_msgSender()` and `_msgData()` must be explicitly overridden to resolve the ambiguity:

```solidity
function _msgSender() internal view override(Context, ERC2771Context) returns (address) {
    return ERC2771Context._msgSender();
}
```

Exposes two mint functions:
- `mint()` — mints a fixed amount to the caller
- `mint(uint256 amount)` — mints a specific amount to the caller

### `MinimalForwarder`

A wrapper around OpenZeppelin's `MinimalForwarder`. Verifies EIP-712 signatures and forwards calls to the target contract with the original sender appended to the calldata.

> Note: `MinimalForwarder` is intended for testing only. For production use, consider a battle-tested solution like [OpenGSN](https://opengsn.org/).

## Project Structure

```
contracts/
  GaslessToken.sol       # ERC20 + ERC2771Context token
  MinimalForwarder.sol   # Wrapper to expose OZ MinimalForwarder as artifact
test/
  GaslessToken.ts        # Meta-transaction test scenarios
```

## Running Tests

```shell
npx hardhat test test/GaslessToken.ts
```

## Dependencies

- [Hardhat 3](https://hardhat.org)
- [OpenZeppelin Contracts v4](https://docs.openzeppelin.com/contracts/4.x/)
- ethers.js v6
- Mocha + Chai
