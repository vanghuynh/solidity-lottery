const ganache = require("ganache");
const { Web3 } = require("web3");
// updated imports added for convenience
const assert = require("assert");

const web3 = new Web3(ganache.provider());

const { interface, bytecode } = require("../compile");

let lottery;
let accounts;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();
  lottery = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({ data: bytecode })
    .send({ from: accounts[0], gas: "1000000" });
});

describe("Lottery Contract", () => {
  it("deploys a contract", () => {
    assert.ok(lottery.options.address);
  });

  it("allows one account to enter", async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei("0.03", "ether"),
    });
    const players = await lottery.methods.getPlayers().call({
      from: accounts[0],
    });
    assert.equal(players[0], accounts[0]);
    assert.equal(players.length, 1);
  });

  it("allows multiple accounts to enter", async () => {
    // first account
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei("0.03", "ether"),
    });
    // second account
    await lottery.methods.enter().send({
      from: accounts[1],
      value: web3.utils.toWei("0.03", "ether"),
    });
    // third account
    await lottery.methods.enter().send({
      from: accounts[2],
      value: web3.utils.toWei("0.03", "ether"),
    });
    const players = await lottery.methods.getPlayers().call({
      from: accounts[0],
    });
    assert.equal(players[0], accounts[0]);
    assert.equal(players[1], accounts[1]);
    assert.equal(players[2], accounts[2]);
    assert.equal(players.length, 3);
  });
  it("requires a minimun amount of ether to enter", async () => {
    try {
      await lottery.methods.enter().send({
        from: accounts[0],
        value: 200,
      });
      assert.fail();
    } catch (err) {
      assert.ok(err);
    }
  });
  it("only manager can call pickWinner", async () => {
    try {
      await lottery.methods.pickWinner().send({
        from: accounts[1],
        value: web3.utils.toWei("0.03", "ether"),
      });
      assert.fail();
    } catch (err) {
      assert.ok(err);
    }
  });
  it("sends money to the winner and resets the players array", async () => {
    // end to end test flow
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei("2", "ether"),
    });
    const initialBalance = await web3.eth.getBalance(accounts[0]);
    await lottery.methods.pickWinner().send({
      from: accounts[0],
    });
    const finalBalance = await web3.eth.getBalance(accounts[0]);
    const difference = finalBalance - initialBalance;
    assert.ok(difference > web3.utils.toWei("1.9", "ether"));
    assert.ok(difference < web3.utils.toWei("2", "ether"));
  });
});
