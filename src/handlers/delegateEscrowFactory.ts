import { Address, BigDecimal, log } from "@graphprotocol/graph-ts";
import {
  Delegate as DelegateEvent,
  DelegateEscrowCreated as DelegateEscrowCreatedEvent,
} from "../../generated/DelegateEscrowFactory/DelegateEscrowFactory";
import {
  CoolerDelegationBalance,
  CoolerDelegationEvent,
  DelegateEscrow,
  Voter,
} from "../../generated/schema";
import { GOHM_DECIMALS } from "../constants";
import { toDecimal } from "../utils/number";
import { getOrCreateVoter } from "../voter";

/**
 * Handles the DelegateEscrowCreated event.
 * Creates a DelegateEscrow entity to track the mapping between escrow contracts and their delegatees.
 */
export function handleDelegateEscrowCreated(
  event: DelegateEscrowCreatedEvent,
): void {
  log.info("Handling DelegateEscrowCreated: escrow={}, delegatee={}", [
    event.params.escrow.toHexString(),
    event.params.delegate.toHexString(),
  ]);

  // Get or create the Voter entity for the delegatee
  const voter = getOrCreateVoter(event.params.delegate);

  // Create the DelegateEscrow entity
  const escrowEntity = new DelegateEscrow(event.params.escrow);
  escrowEntity.escrow = event.params.escrow;
  escrowEntity.delegatee = voter.id;
  escrowEntity.blockNumber = event.block.number;
  escrowEntity.blockTimestamp = event.block.timestamp;
  escrowEntity.save();

  log.info("Created DelegateEscrow: escrow={} -> delegatee={}", [
    event.params.escrow.toHexString(),
    event.params.delegate.toHexString(),
  ]);
}

/**
 * Handles the Delegate event.
 * Creates an immutable CoolerDelegationEvent to track the delegation change,
 * links it to the VoterVotingPowerSnapshot, and updates the CoolerDelegationBalance.
 */
export function handleDelegate(event: DelegateEvent): void {
  log.info("Handling Delegate: escrow={}, caller={}, onBehalfOf={}, delta={}", [
    event.params.escrow.toHexString(),
    event.params.caller.toHexString(),
    event.params.onBehalfOf.toHexString(),
    event.params.delegationAmountDelta.toString(),
  ]);

  // Look up the DelegateEscrow to find the delegatee
  const escrowEntity = DelegateEscrow.load(event.params.escrow);
  if (!escrowEntity) {
    log.warning("DelegateEscrow not found for escrow={}", [
      event.params.escrow.toHexString(),
    ]);
    return;
  }

  // Get the delegatee voter - convert Bytes to Address
  const delegateeAddress = Address.fromBytes(escrowEntity.delegatee);
  const delegateeVoter = getOrCreateVoter(delegateeAddress);

  // Convert the delegation amount delta to BigDecimal
  const deltaBigDecimal = toDecimal(
    event.params.delegationAmountDelta,
    GOHM_DECIMALS,
  );

  // Create immutable CoolerDelegationEvent
  // ID format: {blockNumber}-{logIndex}
  const eventId =
    event.block.number.toString() + "-" + event.logIndex.toString();

  const coolerDelegationEvent = new CoolerDelegationEvent(eventId);
  coolerDelegationEvent.delegator = event.params.onBehalfOf;
  coolerDelegationEvent.delegatee = delegateeVoter.id;
  coolerDelegationEvent.escrow = escrowEntity.id;
  coolerDelegationEvent.amount = deltaBigDecimal;
  coolerDelegationEvent.blockNumber = event.block.number;
  coolerDelegationEvent.blockTimestamp = event.block.timestamp;
  coolerDelegationEvent.transactionHash = event.transaction.hash;

  // Link to the VoterVotingPowerSnapshot
  // The DelegateVotesChanged event (which creates the snapshot) fires BEFORE the Delegate event
  // in the same transaction, so we can look up the voter's latest snapshot
  const voter = Voter.load(delegateeVoter.id);
  const latestSnapshot = voter ? voter.latestVotingPowerSnapshot : null;

  if (latestSnapshot) {
    coolerDelegationEvent.snapshot = latestSnapshot;
    log.info("Linked CoolerDelegationEvent to snapshot: {} for delegatee: {}", [
      latestSnapshot.toHexString(),
      delegateeAddress.toHexString(),
    ]);
  } else {
    log.warning(
      "No VoterVotingPowerSnapshot found for delegatee: {}. This may indicate the snapshot was not created yet.",
      [delegateeAddress.toHexString()],
    );
    // We still need to set the snapshot field - use a placeholder that indicates missing snapshot
    // This shouldn't happen in normal operation since DelegateVotesChanged fires before Delegate
    // But we need to handle it to avoid runtime errors
    // For now, we'll create a synthetic ID based on the event
    const syntheticSnapshotId = delegateeAddress
      .concatI32(event.block.number.toI32())
      .concatI32(event.logIndex.toI32());
    coolerDelegationEvent.snapshot = syntheticSnapshotId;
  }

  coolerDelegationEvent.save();

  log.info(
    "Created CoolerDelegationEvent: id={}, delegator={} -> delegatee={}, amount={}",
    [
      eventId,
      event.params.onBehalfOf.toHexString(),
      delegateeAddress.toHexString(),
      deltaBigDecimal.toString(),
    ],
  );

  // Update or create CoolerDelegationBalance for running totals
  const balanceId =
    event.params.onBehalfOf.toHexString() +
    "-" +
    delegateeAddress.toHexString();

  let balance = CoolerDelegationBalance.load(balanceId);

  if (!balance) {
    balance = new CoolerDelegationBalance(balanceId);
    balance.delegator = event.params.onBehalfOf;
    balance.delegatee = delegateeVoter.id;
    balance.amount = deltaBigDecimal;
    balance.blockNumber = event.block.number;
    balance.blockTimestamp = event.block.timestamp;
  } else {
    balance.amount = balance.amount.plus(deltaBigDecimal);
  }

  balance.save();

  log.info(
    "Updated CoolerDelegationBalance: delegator={} -> delegatee={}, total={}",
    [
      event.params.onBehalfOf.toHexString(),
      delegateeAddress.toHexString(),
      balance.amount.toString(),
    ],
  );
}
