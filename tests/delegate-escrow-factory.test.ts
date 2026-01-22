import {
  assert,
  describe,
  test,
  clearStore,
  afterEach,
} from "matchstick-as/assembly/index";
import { Address, BigInt, BigDecimal, Bytes } from "@graphprotocol/graph-ts";
import {
  createDelegateEscrowCreatedEvent,
  createDelegateEvent,
} from "./delegate-escrow-factory-utils";
import {
  handleDelegateEscrowCreated,
  handleDelegate,
} from "../src/handlers/delegateEscrowFactory";
import {
  CoolerDelegateEscrow,
  CoolerDelegationBalance,
  CoolerDelegationEvent,
  Voter,
  VoterVotingPowerSnapshot,
} from "../generated/schema";

/**
 * Creates a VoterVotingPowerSnapshot for a voter.
 * This simulates the DelegateVotesChanged event that fires before the Delegate event.
 */
function createVoterSnapshot(
  voterAddress: Address,
  blockNumber: BigInt,
  logIndex: BigInt,
): VoterVotingPowerSnapshot {
  // Create snapshot ID: {voter}{blockNumber}{logIndex}
  const snapshotId = voterAddress
    .concatI32(blockNumber.toI32())
    .concatI32(logIndex.toI32());

  const snapshot = new VoterVotingPowerSnapshot(snapshotId);
  snapshot.voter = voterAddress;
  snapshot.votingPower = BigDecimal.fromString("0");
  snapshot.blockNumber = blockNumber;
  snapshot.blockTimestamp = BigInt.fromI32(1234567890);
  snapshot.save();

  // Update voter's latestVotingPowerSnapshot
  let voter = Voter.load(voterAddress);
  if (!voter) {
    voter = new Voter(voterAddress);
    voter.address = voterAddress;
  }
  voter.latestVotingPowerSnapshot = snapshotId;
  voter.save();

  return snapshot;
}

const ESCROW = Address.fromString("0x0000000000000000000000000000000000000001");
const DELEGATEE = Address.fromString(
  "0x0000000000000000000000000000000000000002",
);
const DELEGATOR = Address.fromString(
  "0x0000000000000000000000000000000000000003",
);
const CALLER = Address.fromString("0x0000000000000000000000000000000000000004");

describe("DelegateEscrowFactory", () => {
  afterEach(() => {
    clearStore();
  });

  test("Creates CoolerDelegateEscrow entity", () => {
    const event = createDelegateEscrowCreatedEvent(CALLER, DELEGATEE, ESCROW);
    handleDelegateEscrowCreated(event);

    assert.entityCount("CoolerDelegateEscrow", 1);
    assert.fieldEquals(
      "CoolerDelegateEscrow",
      ESCROW.toHexString(),
      "delegatee",
      DELEGATEE.toHexString(),
    );
  });

  test("Creates CoolerDelegationEvent on Delegate event", () => {
    // First create the escrow
    const escrowEvent = createDelegateEscrowCreatedEvent(
      CALLER,
      DELEGATEE,
      ESCROW,
    );
    handleDelegateEscrowCreated(escrowEvent);

    // Create voter snapshot (simulates DelegateVotesChanged event that fires before Delegate)
    const blockNumber = BigInt.fromI32(1);
    const logIndex = BigInt.fromI32(0); // Snapshot log index comes before Delegate event
    createVoterSnapshot(DELEGATEE, blockNumber, logIndex);

    // Then delegate
    const amount = BigInt.fromString("100000000000000000000"); // 100 gOHM
    const delegateEvent = createDelegateEvent(
      ESCROW,
      CALLER,
      DELEGATOR,
      amount,
    );
    handleDelegate(delegateEvent);

    // Check CoolerDelegationEvent was created (immutable event record)
    assert.entityCount("CoolerDelegationEvent", 1);

    // Check CoolerDelegationBalance was created (mutable running total)
    const coolerDelegationBalanceId =
      DELEGATOR.toHexString() + "-" + DELEGATEE.toHexString();
    assert.entityCount("CoolerDelegationBalance", 1);
    assert.fieldEquals(
      "CoolerDelegationBalance",
      coolerDelegationBalanceId,
      "delegator",
      DELEGATOR.toHexString(),
    );
  });

  test("Updates CoolerDelegationBalance on multiple Delegate events", () => {
    // First create the escrow
    const escrowEvent = createDelegateEscrowCreatedEvent(
      CALLER,
      DELEGATEE,
      ESCROW,
    );
    handleDelegateEscrowCreated(escrowEvent);

    // Create voter snapshot (simulates DelegateVotesChanged event that fires before Delegate)
    // In real usage, each delegation creates a new snapshot, but for testing we just need one
    const blockNumber = BigInt.fromI32(1);
    const logIndex = BigInt.fromI32(0); // Snapshot log index comes before Delegate events
    createVoterSnapshot(DELEGATEE, blockNumber, logIndex);

    // First delegation (block 1, log index 1)
    const amount1 = BigInt.fromString("100000000000000000000"); // 100 gOHM
    const delegateEvent1 = createDelegateEvent(
      ESCROW,
      CALLER,
      DELEGATOR,
      amount1,
      BigInt.fromI32(1),
      BigInt.fromI32(1),
    );
    handleDelegate(delegateEvent1);

    // Second delegation (block 1, log index 2 - different log index)
    const amount2 = BigInt.fromString("50000000000000000000"); // 50 gOHM
    const delegateEvent2 = createDelegateEvent(
      ESCROW,
      CALLER,
      DELEGATOR,
      amount2,
      BigInt.fromI32(1),
      BigInt.fromI32(2),
    );
    handleDelegate(delegateEvent2);

    // Should have 2 immutable event records
    assert.entityCount("CoolerDelegationEvent", 2);

    // Should have 1 balance record with updated total
    assert.entityCount("CoolerDelegationBalance", 1);
  });
});
