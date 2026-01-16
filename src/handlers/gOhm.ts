import { Address, Bytes, log } from "@graphprotocol/graph-ts";
import {
  DelegateChanged as DelegateChangedEvent,
  DelegateVotesChanged as DelegateVotesChangedEvent,
} from "../../generated/gOHM/gOHM";
import {
  CoolerDelegateEscrow,
  DelegateChanged,
  DelegateVotesChanged,
} from "../../generated/schema";
import { GOHM_DECIMALS } from "../constants";
import { toDecimal } from "../utils/number";
import { getOrCreateVoteDelegator } from "../voteDelegator";
import { getOrCreateVoter } from "../voter";
import { createVoterVotingPowerSnapshot } from "../voterSnapshot";

export function handleDelegateChanged(event: DelegateChangedEvent): void {
  log.info("Handling DelegateChanged event for delegator: {}", [
    event.params.delegator.toHexString(),
  ]);

  // Check if the delegator is a known escrow contract
  // If so, skip creating VoteDelegator record - the attribution is handled by CoolerDelegationEvent instead
  const escrowEntity = CoolerDelegateEscrow.load(event.params.delegator);
  if (escrowEntity) {
    log.info(
      "Skipping VoteDelegator creation for escrow contract: {}. Attribution handled by CoolerDelegationEvent.",
      [event.params.delegator.toHexString()],
    );
    // We don't create VoteDelegator or DelegateChanged event for escrow contracts
    // The voting power change is still captured by DelegateVotesChanged
    // The delegator attribution is captured by CoolerDelegationEvent
    return;
  }

  // Create/get voters
  log.info("Previous delegatee: {}", [event.params.fromDelegate.toHexString()]);
  log.info("New delegatee: {}", [event.params.toDelegate.toHexString()]);
  const previousVoterId: Bytes | null = event.params.fromDelegate.equals(
    Address.zero(),
  )
    ? null
    : getOrCreateVoter(event.params.fromDelegate).id;
  const newVoterId: Bytes | null = event.params.toDelegate.equals(
    Address.zero(),
  )
    ? null
    : getOrCreateVoter(event.params.toDelegate).id;

  // Update the delegator record to point to the new delegatee
  const voteDelegator = getOrCreateVoteDelegator(
    event.params.delegator,
    event.params.toDelegate,
  );
  voteDelegator.delegatee = newVoterId;
  voteDelegator.save();
  log.info("Saved VoteDelegator record for delegator: {}", [
    event.params.delegator.toHexString(),
  ]);

  // Save the DelegateChanged event
  const entity = new DelegateChanged(
    event.params.delegator
      .concatI32(event.block.number.toI32())
      .concatI32(event.logIndex.toI32()),
  );
  entity.delegator = voteDelegator.id;
  entity.previousDelegatee = previousVoterId;
  entity.newDelegatee = newVoterId;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
  log.info("Saved DelegateChanged event for delegator: {}", [
    event.params.delegator.toHexString(),
  ]);

  // No need to update the old or new delegatee's voting power as they will be updated by the DelegateVotesChangedEvent events
}

export function handleDelegateVotesChanged(
  event: DelegateVotesChangedEvent,
): void {
  log.info("Handling DelegateVotesChanged event for delegatee: {}", [
    event.params.delegate.toHexString(),
  ]);

  const voter = getOrCreateVoter(event.params.delegate);

  // Create a new voting power snapshot for the delegatee
  const votingPowerSnapshot = createVoterVotingPowerSnapshot(voter, event);

  // Update the voter's latest voting power snapshot
  voter.latestVotingPowerSnapshot = votingPowerSnapshot.id;
  voter.save();

  // Create the DelegateVotesChanged record
  const entity = new DelegateVotesChanged(
    event.params.delegate
      .concatI32(event.block.number.toI32())
      .concatI32(event.logIndex.toI32()),
  );
  entity.delegatee = voter.id;
  entity.previousBalance = toDecimal(
    event.params.previousBalance,
    GOHM_DECIMALS,
  );
  entity.newBalance = toDecimal(event.params.newBalance, GOHM_DECIMALS);
  entity.snapshot = votingPowerSnapshot.id;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
