import { newMockEvent } from "matchstick-as";
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts";
import {
  DelegateEscrowCreated,
  Delegate,
} from "../generated/DelegateEscrowFactory/DelegateEscrowFactory";

export function createDelegateEscrowCreatedEvent(
  caller: Address,
  delegate: Address,
  escrow: Address,
): DelegateEscrowCreated {
  const mockEvent = newMockEvent();
  let event = changetype<DelegateEscrowCreated>(mockEvent);

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller)),
  );
  event.parameters.push(
    new ethereum.EventParam("delegate", ethereum.Value.fromAddress(delegate)),
  );
  event.parameters.push(
    new ethereum.EventParam("escrow", ethereum.Value.fromAddress(escrow)),
  );

  return event;
}

export function createDelegateEvent(
  escrow: Address,
  caller: Address,
  onBehalfOf: Address,
  delegationAmountDelta: BigInt,
  blockNumber: BigInt = BigInt.fromI32(1),
  logIndex: BigInt = BigInt.fromI32(1),
): Delegate {
  const mockEvent = newMockEvent();
  let event = changetype<Delegate>(mockEvent);

  event.block.number = blockNumber;
  event.logIndex = logIndex;

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("escrow", ethereum.Value.fromAddress(escrow)),
  );
  event.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller)),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "onBehalfOf",
      ethereum.Value.fromAddress(onBehalfOf),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "delegationAmountDelta",
      ethereum.Value.fromSignedBigInt(delegationAmountDelta),
    ),
  );

  return event;
}
