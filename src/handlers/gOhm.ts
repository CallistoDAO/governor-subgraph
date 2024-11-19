import { Address, Bytes, log } from "@graphprotocol/graph-ts";
import {
  DelegateChanged as DelegateChangedEvent,
  DelegateVotesChanged as DelegateVotesChangedEvent,
} from "../../generated/gOHM/gOHM";
import { DelegateChanged, DelegateVotesChanged } from "../../generated/schema";
import { GOHM_DECIMALS } from "../constants";
import { toDecimal } from "../utils/number";
import { getOrCreateVoteDelegator } from "../voteDelegator";
import { getOrCreateVoter } from "../voter";
import { createVoterVotingPowerSnapshot } from "../voterSnapshot";

export function handleDelegateChanged(event: DelegateChangedEvent): void {
  log.info("Handling DelegateChanged event for delegator: {}", [
    event.params.delegator.toHexString(),
  ]);

  const entity = new DelegateChanged(
    event.params.delegator
      .concatI32(event.block.number.toI32())
      .concatI32(event.logIndex.toI32()),
  );
  entity.delegator = event.params.delegator;
  entity.previousDelegatee = event.params.fromDelegate;
  entity.newDelegatee = event.params.toDelegate;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
  log.info("Saved DelegateChanged event for delegator: {}", [
    event.params.delegator.toHexString(),
  ]);

  // If the votes have been un-delegated, set the voterId to null
  const voterId: Bytes | null = event.params.toDelegate.equals(Address.zero())
    ? null
    : getOrCreateVoter(event.params.toDelegate).id;

  // Update the delegator record to point to the new delegatee
  const voteDelegator = getOrCreateVoteDelegator(
    event.params.delegator,
    event.params.toDelegate,
  );
  voteDelegator.delegatee = voterId;
  voteDelegator.save();
  log.info("Saved VoteDelegator record for delegator: {}", [
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
