import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("GaslessToken", function () {
  async function deployFixture() {
    const [relayer, user] = await ethers.getSigners();

    const forwarder = await ethers.deployContract("MinimalForwarder");
    const token = await ethers.deployContract("GaslessToken", [
      "GaslessToken",
      "GLT",
      await forwarder.getAddress(),
    ]);

    return { forwarder, token, relayer, user };
  }

  it("Should mint tokens to user via meta-tx, gas paid by relayer", async function () {
    const { forwarder, token, relayer, user } = await deployFixture();

    // Encode the mint() call that the user wants to execute
    const mintData = token.interface.encodeFunctionData("mint()");
    console.log('mintData', mintData)

    // Get the user's current nonce on the forwarder
    const nonce = await forwarder.getNonce(user.address);

    const request = {
      from: user.address,
      to: await token.getAddress(),
      value: 0n,
      gas: 100_000n,
      nonce: nonce,
      data: mintData,
    };

    // EIP-712 domain must match MinimalForwarder constructor: EIP712("MinimalForwarder", "0.0.1")
    const { chainId } = await ethers.provider.getNetwork();
    const domain = {
      name: "MinimalForwarder",
      version: "0.0.1",
      chainId: chainId,
      verifyingContract: await forwarder.getAddress(),
    };

    const types = {
      ForwardRequest: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "gas", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "data", type: "bytes" },
      ],
    };

    // User signs off-chain — no gas spent
    const signature = await user.signTypedData(domain, types, request);

    // Verify signature is valid before submitting
    expect(await forwarder.verify(request, signature)).to.be.true;

    // Relayer submits the meta-tx and pays gas on behalf of the user
    await forwarder.connect(relayer).execute(request, signature);

    // Token minted to user (not relayer), proving _msgSender() returned user.address
    const expectedAmount = 10n * await token.decimals();
    expect(await token.balanceOf(user.address)).to.equal(expectedAmount);
    expect(await token.balanceOf(relayer.address)).to.equal(0n);
  });

  it("Should mint specific amount to user via meta-tx using mint(uint256)", async function () {
    const { forwarder, token, relayer, user } = await deployFixture();

    const mintAmount = 500n;

    // Use full signature to disambiguate from mint() overload
    const mintData = token.interface.encodeFunctionData("mint(uint256)", [mintAmount]);
    console.log('mintData', mintData)

    const nonce = await forwarder.getNonce(user.address);

    const request = {
      from: user.address,
      to: await token.getAddress(),
      value: 0n,
      gas: 100_000n,
      nonce: nonce,
      data: mintData,
    };

    const { chainId } = await ethers.provider.getNetwork();
    const domain = {
      name: "MinimalForwarder",
      version: "0.0.1",
      chainId: chainId,
      verifyingContract: await forwarder.getAddress(),
    };

    const types = {
      ForwardRequest: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "gas", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "data", type: "bytes" },
      ],
    };

    const signature = await user.signTypedData(domain, types, request);

    expect(await forwarder.verify(request, signature)).to.be.true;

    await forwarder.connect(relayer).execute(request, signature);

    expect(await token.balanceOf(user.address)).to.equal(mintAmount);
    expect(await token.balanceOf(relayer.address)).to.equal(0n);
  });
});
