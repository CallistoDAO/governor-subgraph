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
import { DelegateEscrow, CoolerDelegation } from "../generated/schema";

const ESCROW = Address.fromString("0x0000000000000000000000000000000000000001");
const DELEGATE = Address.fromString("0x0000000000000000000000000000000000000002");
const USER = Address.fromString("0x0000000000000000000000000000000000000003");
const CALLER = Address.fromString("0x0000000000000000000000000000000000000004");

describe("DelegateEscrowFactory", () => {
  afterEach(() => {
    clearStore();
  });

  test("Creates DelegateEscrow entity", () => {
    const event = createDelegateEscrowCreatedEvent(CALLER, DELEGATE, ESCROW);
    handleDelegateEscrowCreated(event);

    assert.entityCount("DelegateEscrow", 1);
    assert.fieldEquals(
      "DelegateEscrow",
      ESCROW.toHexString(),
      "delegate",
      DELEGATE.toHexString(),
    );
  });

  test("Creates CoolerDelegation on Delegate event", () => {
    // First create the escrow
    const escrowEvent = createDelegateEscrowCreatedEvent(CALLER, DELEGATE, ESCROW);
    handleDelegateEscrowCreated(escrowEvent);

    // Then delegate
    const amount = BigInt.fromString("100000000000000000000"); // 100 gOHM
    const delegateEvent = createDelegateEvent(ESCROW, CALLER, USER, amount);
    handleDelegate(delegateEvent);

    const coolerDelegationId = USER.toHexString() + "-" + DELEGATE.toHexString();
    assert.entityCount("CoolerDelegation", 1);
    assert.fieldEquals("CoolerDelegation", coolerDelegationId, "user", USER.toHexString());
  });
});
