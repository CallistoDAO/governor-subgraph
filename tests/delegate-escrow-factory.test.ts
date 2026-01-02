import {
  assert,
  describe,
  test,
  clearStore,
  afterEach,
} from "matchstick-as/assembly/index";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  createDelegateEscrowCreatedEvent,
  createDelegateEvent,
} from "./delegate-escrow-factory-utils";
import {
  handleDelegateEscrowCreated,
  handleDelegate,
} from "../src/handlers/delegateEscrowFactory";
import {
  CoolerDelegationBalance,
  CoolerDelegationEvent,
  DelegateEscrow,
} from "../generated/schema";

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

  test("Creates DelegateEscrow entity", () => {
    const event = createDelegateEscrowCreatedEvent(CALLER, DELEGATEE, ESCROW);
    handleDelegateEscrowCreated(event);

    assert.entityCount("DelegateEscrow", 1);
    assert.fieldEquals(
      "DelegateEscrow",
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
