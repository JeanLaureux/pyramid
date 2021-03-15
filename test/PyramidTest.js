const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { loadFixture } = require('ethereum-waffle');

describe("Pyramid", function() {

  beforeEach(async function () {
    const Pyramid = await ethers.getContractFactory("Pyramid");
    this.pyramid = await Pyramid.deploy(ethers.utils.parseEther("0.1") , { value: ethers.utils.parseEther("200") });
    await this.pyramid.deployed();
  });

  it("starts with contract creator", async function() {
    const [creator, ...addrs] = await ethers.getSigners();
    expect(await this.pyramid.getHistoryLength()).to.equal(1);
    expect(await this.pyramid.getNextTakePrice()).to.equal(ethers.utils.parseEther("0.11") );
    expect(await this.pyramid.getPyramidOwner()).to.equal(creator.address);
  });

  it("enforces take price", async function() {
    const [creator, addr1, ...addrs] = await ethers.getSigners();
    await expect(this.pyramid.connect(addr1).take({value: ethers.utils.parseEther("0.09") })).to.be.revertedWith("Insufficient takePrice");
    expect(await this.pyramid.getHistoryLength()).to.equal(1);
    expect(await this.pyramid.getPyramidOwner()).to.equal(creator.address);
  });

  it("allows taking", async function() {
    const [creator, addr1, ...addrs] = await ethers.getSigners();
    await this.pyramid.connect(addr1).take({value: ethers.utils.parseEther("0.2") });
    expect(await this.pyramid.getHistoryLength()).to.equal(2);
    expect(await this.pyramid.getNextTakePrice()).to.equal(ethers.utils.parseEther("0.22") );
    expect(await this.pyramid.getPyramidOwner()).to.equal(addr1.address);
  });

  it("stays locked for non-owners", async function() {
    expect(await this.pyramid.getHistoryLength()).to.equal(1);
    const [creator, addr1, ...addrs] = await ethers.getSigners();
    await this.pyramid.connect(addr1).take({value: ethers.utils.parseEther("0.2") });
    await expect(this.pyramid.unlock()).to.be.revertedWith("Only the Pyramid's owner can unlock it.");
  });

  it("stays locked until unlock time", async function() {
    const [creator, ...addrs] = await ethers.getSigners();
    await expect(this.pyramid.unlock()).to.be.revertedWith("The Pyramid cannot be unlocked yet.");
  });

  it("can be opened by creator after lock time", async function() {
    const [creator, addr1, ...addrs] = await ethers.getSigners();
    await this.pyramid.connect(addr1).take({value: ethers.utils.parseEther("0.2") });

    // Let 100 days pass
    await network.provider.request({
      method: "evm_increaseTime",
      params: [100 * 24 * 60 * 60],
    });
    await network.provider.request({
      method: "evm_mine",
      params: [],
    });

    const creatorPreBalance = await creator.getBalance();
    const addr1PreBalance = await addr1.getBalance();

    // Addr1 unlocks the this.pyramid
    await this.pyramid.connect(addr1).unlock();

    //Verify the correct amounts were sent to the creator and creator
    const creatorPostBalance = await creator.getBalance();
    const addr1PostBalance = await addr1.getBalance();
    const addr1Delta = addr1PostBalance - addr1PreBalance;
    const creatorDelta = creatorPostBalance - creatorPreBalance;
    expect(creatorDelta / ethers.utils.parseEther("2.22")).to.be.greaterThan(0.009)
    expect(addr1Delta / ethers.utils.parseEther("2.22")).to.be.greaterThan(0.989)
  });

  it("can't be opened twice", async function() {
    const [creator, addr1, ...addrs] = await ethers.getSigners();

    // Let 100 days pass
    await network.provider.request({
      method: "evm_increaseTime",
      params: [100 * 24 * 60 * 60],
    });
    await network.provider.request({
      method: "evm_mine",
      params: [],
    });;

    // Creator unlocks the this.pyramid
    await this.pyramid.unlock();
    await expect(this.pyramid.unlock()).to.be.revertedWith("The Pyramid has already been unlocked.");
  });
});
