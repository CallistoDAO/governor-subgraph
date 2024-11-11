import {
  assert,
  describe,
  test,
  clearStore,
  afterEach,
  beforeEach,
  createMockedFunction,
} from "matchstick-as/assembly/index";
import { Address, BigDecimal, BigInt, ethereum, log } from "@graphprotocol/graph-ts";
import { createDelegateChangedEvent, createDelegateVotesChangedEvent } from "./g-ohm-utils";
import { handleDelegateChanged, handleDelegateVotesChanged } from "../src/handlers/gOhm";
import { GOHM_CONTRACT, GOHM_DECIMALS } from "../src/constants";
import { toBigInt } from "../src/utils/number";
import { DelegateChanged, VoteDelegator, VoteDelegatorSnapshot, Voter, VoterVotingPowerSnapshot } from "../generated/schema";

const HOLDER = Address.fromString("0x0000000000000000000000000000000000000001");
const VOTER = Address.fromString("0x0000000000000000000000000000000000000002");
const GOHM_BALANCE = BigDecimal.fromString("100");

const DEFAULT_BLOCK_NUMBER = BigInt.fromI32(1);
const DEFAULT_LOG_INDEX = BigInt.fromI32(1);

describe("delegation", () => {
  beforeEach(() => {
      // Emit the delegation changed event
      const delegateChangedEvent = createDelegateChangedEvent(
        HOLDER,
        Address.zero(),
        VOTER,
        DEFAULT_LOG_INDEX,
      );
      handleDelegateChanged(delegateChangedEvent);

      // Mock the gOHM balance
      createMockedFunction(Address.fromString(GOHM_CONTRACT), "balanceOf", "balanceOf(address):(uint256)").withArgs([ethereum.Value.fromAddress(HOLDER)]).returns([
        ethereum.Value.fromUnsignedBigInt(toBigInt(GOHM_BALANCE, GOHM_DECIMALS))
      ]);

      // Emit the voting power changed event
      const delegateVotesChangedEvent = createDelegateVotesChangedEvent(
        VOTER,
        BigInt.fromI32(0),
        toBigInt(GOHM_BALANCE, GOHM_DECIMALS),
        DEFAULT_LOG_INDEX,
      );
      handleDelegateVotesChanged(delegateVotesChangedEvent);
  });

  afterEach(() => {
    clearStore();
  });

  test("initial delegation", () => {
    // Validate DelegateChanged entity
    assert.entityCount("DelegateChanged", 1, "DelegateChanged: Should be 1 DelegateChanged entity");
    const delegateChangedRecord = DelegateChanged.load(
      HOLDER.concatI32(DEFAULT_BLOCK_NUMBER.toI32()).concatI32(DEFAULT_LOG_INDEX.toI32())
    );
    assert.stringEquals(delegateChangedRecord!.delegator.toHexString(), HOLDER.toHexString(), "DelegateChanged: Delegator should be the holder");
    assert.stringEquals(delegateChangedRecord!.previousDelegatee.toHexString(), Address.zero().toHexString(), "DelegateChanged: Previous delegatee should be the zero address");
    assert.stringEquals(delegateChangedRecord!.newDelegatee.toHexString(), VOTER.toHexString(), "DelegateChanged: New delegatee should be the voter");

    // Validate VoteDelegatorSnapshot entity
    assert.entityCount("VoteDelegatorSnapshot", 1, "VoteDelegatorSnapshot: Should be 1 VoteDelegatorSnapshot entity");
    const voteDelegatorSnapshotRecord = VoteDelegatorSnapshot.load(HOLDER.concatI32(DEFAULT_BLOCK_NUMBER.toI32()).concatI32(DEFAULT_LOG_INDEX.toI32()));
    assert.stringEquals(voteDelegatorSnapshotRecord!.delegator.toHexString(), HOLDER.toHexString(), "VoteDelegatorSnapshot: Delegator should be the holder");
    assert.stringEquals(voteDelegatorSnapshotRecord!.balance.toString(), GOHM_BALANCE.toString(), "VoteDelegatorSnapshot: Balance should be the gOHM balance");

    // Validate VoteDelegator entity
    assert.entityCount("VoteDelegator", 1, "VoteDelegator: Should be 1 VoteDelegator entity");
    const voteDelegatorRecord = VoteDelegator.load(HOLDER);
    assert.stringEquals(voteDelegatorRecord!.holder.toHexString(), HOLDER.toHexString(), "VoteDelegator: Holder should be the holder");
    assert.stringEquals(voteDelegatorRecord!.delegatee.toHexString(), VOTER.toHexString(), "VoteDelegator: Delegatee should be the voter");
    assert.stringEquals(voteDelegatorRecord!.latestSnapshot!.toHexString(), voteDelegatorSnapshotRecord!.id.toHexString(), "VoteDelegator: Latest snapshot should be the vote delegator snapshot");

    // Validate VoterVotingPowerSnapshot entity
    assert.entityCount("VoterVotingPowerSnapshot", 1, "VoterVotingPowerSnapshot: Should be 1 VoterVotingPowerSnapshot entity");
    const voterVotingPowerSnapshotRecord = VoterVotingPowerSnapshot.load(VOTER.concatI32(DEFAULT_BLOCK_NUMBER.toI32()).concatI32(DEFAULT_LOG_INDEX.toI32()));
    assert.stringEquals(voterVotingPowerSnapshotRecord!.voter.toHexString(), VOTER.toHexString(), "VoterVotingPowerSnapshot: Voter should be the voter");
    assert.stringEquals(voterVotingPowerSnapshotRecord!.votingPower.toString(), GOHM_BALANCE.toString(), "VoterVotingPowerSnapshot: Voting power should be the gOHM balance");
    const delegatorSnapshots = voterVotingPowerSnapshotRecord!.delegatorSnapshots;
    assert.i32Equals(delegatorSnapshots.length, 1, "VoterVotingPowerSnapshot: Delegator snapshots length should be 1");
    assert.stringEquals(delegatorSnapshots[0].toHexString(), voteDelegatorSnapshotRecord!.id.toHexString(), "VoterVotingPowerSnapshot: First delegator snapshot should be the vote delegator snapshot");

    // Validate Voter entity
    assert.entityCount("Voter", 1, "Voter: Should be 1 Voter entity");
    const voterRecord = Voter.load(VOTER);
    assert.stringEquals(voterRecord!.address.toHexString(), VOTER.toHexString(), "Voter: Address should be the voter");
    assert.stringEquals(voterRecord!.latestVotingPowerSnapshot!.toHexString(), voterVotingPowerSnapshotRecord!.id.toHexString(), "Voter: Latest voting power snapshot should be the voter voting power snapshot");
  });

  test("delegatee changed", () => {
    // Bump the log index
    const newLogIndex = DEFAULT_LOG_INDEX.plus(BigInt.fromI32(1));

    // These mimic what happens when a delegator changes their delegatee
    // Emit a delegation changed event with a different delegatee
    const delegateChangedEvent = createDelegateChangedEvent(
      HOLDER,
      VOTER,
      Address.fromString("0x0000000000000000000000000000000000000003"),
      newLogIndex,
    );
    handleDelegateChanged(delegateChangedEvent);

    // Emit a delegate votes changed event with the old delegate
    const previousDelegateVotesChangedEvent = createDelegateVotesChangedEvent(
      VOTER,
      toBigInt(GOHM_BALANCE, GOHM_DECIMALS),
      BigInt.fromI32(0),
      newLogIndex,
    );
    handleDelegateVotesChanged(previousDelegateVotesChangedEvent);

    // Emit a delegate votes changed event with the new delegate
    const newDelegateVotesChangedEvent = createDelegateVotesChangedEvent(
      Address.fromString("0x0000000000000000000000000000000000000003"),
      BigInt.fromI32(0),
      toBigInt(GOHM_BALANCE, GOHM_DECIMALS),
      newLogIndex,
    );
    handleDelegateVotesChanged(newDelegateVotesChangedEvent);

    // Should be a new Voter entity
    assert.entityCount("Voter", 2, "Voter: Should be 2 Voter entities");
    const newVoterRecord = Voter.load(Address.fromString("0x0000000000000000000000000000000000000003"));
    assert.stringEquals(newVoterRecord!.address.toHexString(), Address.fromString("0x0000000000000000000000000000000000000003").toHexString(), "Voter: Address should be the new delegatee");

    // Validate DelegateChanged entity
    assert.entityCount("DelegateChanged", 2, "DelegateChanged: Should be 2 DelegateChanged entities");
    const delegateChangedRecord = DelegateChanged.load(
      HOLDER.concatI32(DEFAULT_BLOCK_NUMBER.toI32()).concatI32(newLogIndex.toI32())
    );
    assert.stringEquals(delegateChangedRecord!.delegator.toHexString(), HOLDER.toHexString(), "DelegateChanged: Delegator should be the holder");
    assert.stringEquals(delegateChangedRecord!.previousDelegatee.toHexString(), VOTER.toHexString(), "DelegateChanged: Previous delegatee should be the voter");
    assert.stringEquals(delegateChangedRecord!.newDelegatee.toHexString(), Address.fromString("0x0000000000000000000000000000000000000003").toHexString(), "DelegateChanged: New delegatee should be the new delegatee");

    // Validate VoterVotingPowerSnapshot for the old delegatee
    const previousDelegateeVotingPowerSnapshotRecord = VoterVotingPowerSnapshot.load(VOTER.concatI32(DEFAULT_BLOCK_NUMBER.toI32()).concatI32(newLogIndex.toI32()));
    assert.stringEquals(previousDelegateeVotingPowerSnapshotRecord!.votingPower.toString(), "0", "VoterVotingPowerSnapshot: Voting power of previous delegatee should be 0");

    // Validate VoterVotingPowerSnapshot for the new delegatee
    const newDelegateeVotingPowerSnapshotRecord = VoterVotingPowerSnapshot.load(Address.fromString("0x0000000000000000000000000000000000000003").concatI32(DEFAULT_BLOCK_NUMBER.toI32()).concatI32(newLogIndex.toI32()));
    assert.stringEquals(newDelegateeVotingPowerSnapshotRecord!.votingPower.toString(), GOHM_BALANCE.toString(), "VoterVotingPowerSnapshot: Voting power of new delegatee should be the gOHM balance");
  });

  test("transfer with recipient not delegated", () => {
    // Bump the log index
    const newLogIndex = DEFAULT_LOG_INDEX.plus(BigInt.fromI32(1));

    // Mimic a transfer of gOHM from one holder to another, which results in a change of delegation power
    // Emit a delegate votes changed event for the old delegate
    const fromDelegateVotesChangedEvent = createDelegateVotesChangedEvent(
      VOTER,
      toBigInt(BigDecimal.fromString("50"), GOHM_DECIMALS),
      BigInt.fromI32(0),
      newLogIndex,
    );
    handleDelegateVotesChanged(fromDelegateVotesChangedEvent);

    // Should be a new Voter entity
    assert.entityCount("Voter", 1, "Voter: Should be 1 Voter entities");

    // Validate VoterVotingPowerSnapshot for the old delegatee
    const previousDelegateeVotingPowerSnapshotRecord = VoterVotingPowerSnapshot.load(VOTER.concatI32(DEFAULT_BLOCK_NUMBER.toI32()).concatI32(newLogIndex.toI32()));
    assert.stringEquals(previousDelegateeVotingPowerSnapshotRecord!.votingPower.toString(), "50", "VoterVotingPowerSnapshot: Voting power of previous delegatee should be 50");

    // Validate VoterVotingPowerSnapshot for the new delegatee
    const newDelegateeVotingPowerSnapshotRecord = VoterVotingPowerSnapshot.load(Address.fromString("0x0000000000000000000000000000000000000003").concatI32(DEFAULT_BLOCK_NUMBER.toI32()).concatI32(newLogIndex.toI32()));
    assert.assertNull(newDelegateeVotingPowerSnapshotRecord, "VoterVotingPowerSnapshot: New delegatee should not have a voting power snapshot");
  });
});
