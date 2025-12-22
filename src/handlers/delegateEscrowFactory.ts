import { Address, log } from "@graphprotocol/graph-ts";
import {
  Delegate as DelegateEvent,
  DelegateEscrowCreated as DelegateEscrowCreatedEvent,
} from "../../generated/DelegateEscrowFactory/DelegateEscrowFactory";
import { CoolerDelegation, DelegateEscrow } from "../../generated/schema";
import { GOHM_DECIMALS } from "../constants";
import { toDecimal } from "../utils/number";
import { getOrCreateVoter } from "../voter";

/**
 * Handles the DelegateEscrowCreated event.
 * Creates a DelegateEscrow entity to track the mapping between escrow contracts and their delegates.
 */
export function handleDelegateEscrowCreated(
  event: DelegateEscrowCreatedEvent,
): void {
  log.info("Handling DelegateEscrowCreated: escrow={}, delegate={}", [
    event.params.escrow.toHexString(),
    event.params.delegate.toHexString(),
  ]);

  // Get or create the Voter entity for the delegate
  const voter = getOrCreateVoter(event.params.delegate);

  // Create the DelegateEscrow entity
  const escrowEntity = new DelegateEscrow(event.params.escrow);
  escrowEntity.escrow = event.params.escrow;
  escrowEntity.delegate = voter.id;
  escrowEntity.blockNumber = event.block.number;
  escrowEntity.blockTimestamp = event.block.timestamp;
  escrowEntity.save();

  log.info("Created DelegateEscrow: escrow={} -> delegate={}", [
    event.params.escrow.toHexString(),
    event.params.delegate.toHexString(),
  ]);
}

/**
 * Handles the Delegate event.
 * Creates or updates a CoolerDelegation entity to track the original user's delegation.
 */
export function handleDelegate(event: DelegateEvent): void {
  log.info("Handling Delegate: escrow={}, caller={}, onBehalfOf={}, delta={}", [
    event.params.escrow.toHexString(),
    event.params.caller.toHexString(),
    event.params.onBehalfOf.toHexString(),
    event.params.delegationAmountDelta.toString(),
  ]);

  // Look up the DelegateEscrow to find the delegate
  const escrowEntity = DelegateEscrow.load(event.params.escrow);
  if (!escrowEntity) {
    log.warning("DelegateEscrow not found for escrow={}", [
      event.params.escrow.toHexString(),
    ]);
    return;
  }

  // Get the delegate voter - convert Bytes to Address
  const delegateAddress = Address.fromBytes(escrowEntity.delegate);
  const delegateVoter = getOrCreateVoter(delegateAddress);

  // Create the CoolerDelegation ID: user-delegate
  const coolerDelegationId =
    event.params.onBehalfOf.toHexString() +
    "-" +
    delegateVoter.address.toHexString();

  // Load or create the CoolerDelegation entity
  let coolerDelegation = CoolerDelegation.load(coolerDelegationId);

  // Convert the delegation amount delta to BigDecimal
  const deltaBigDecimal = toDecimal(
    event.params.delegationAmountDelta,
    GOHM_DECIMALS,
  );

  if (!coolerDelegation) {
    // Create new CoolerDelegation
    coolerDelegation = new CoolerDelegation(coolerDelegationId);
    coolerDelegation.user = event.params.onBehalfOf;
    coolerDelegation.delegate = delegateVoter.id;
    coolerDelegation.escrow = event.params.escrow;
    coolerDelegation.amount = deltaBigDecimal;
    coolerDelegation.blockNumber = event.block.number;
    coolerDelegation.blockTimestamp = event.block.timestamp;
  } else {
    // Update existing CoolerDelegation amount
    coolerDelegation.amount = coolerDelegation.amount.plus(deltaBigDecimal);
    // Update escrow in case it changed (shouldn't happen, but for safety)
    coolerDelegation.escrow = event.params.escrow;
  }

  coolerDelegation.save();

  log.info("Saved CoolerDelegation: user={} -> delegate={}, amount={}", [
    event.params.onBehalfOf.toHexString(),
    delegateVoter.address.toHexString(),
    coolerDelegation.amount.toString(),
  ]);
}
