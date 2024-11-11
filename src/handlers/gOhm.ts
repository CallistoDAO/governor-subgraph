import {
  DelegateChanged as DelegateChangedEvent,
  DelegateVotesChanged as DelegateVotesChangedEvent,
} from "../../generated/gOHM/gOHM";
import { DelegateChanged, DelegateVotesChanged } from "../../generated/schema";
import { GOHM_DECIMALS } from "../constants";
import { toDecimal } from "../utils/number";
import { getOrCreateVoteDelegator } from "../voteDelegator";
import { createVoterVotingPowerSnapshot, getOrCreateVoter } from "../voter";

export function handleDelegateChanged(event: DelegateChangedEvent): void {
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

  // Update the delegator record to point to the new delegatee
  const voteDelegator = getOrCreateVoteDelegator(
    event.params.delegator,
    event.params.toDelegate,
  );
  voteDelegator.delegatee = getOrCreateVoter(event.params.toDelegate).id;
  voteDelegator.save();

  // Re-calculate the previous delegatee's voting power
  const previousVoter = getOrCreateVoter(event.params.fromDelegate);
  previousVoter.latestVotingPowerSnapshot = createVoterVotingPowerSnapshot(
    event.params.fromDelegate,
    event,
  ).id;
  previousVoter.save();
}

export function handleDelegateVotesChanged(
  event: DelegateVotesChangedEvent,
): void {
  const entity = new DelegateVotesChanged(
    event.params.delegate
      .concatI32(event.block.number.toI32())
      .concatI32(event.logIndex.toI32()),
  );

  const voter = getOrCreateVoter(event.params.delegate);
  entity.delegatee = voter.id;
  entity.previousBalance = toDecimal(
    event.params.previousBalance,
    GOHM_DECIMALS,
  );
  entity.newBalance = toDecimal(event.params.newBalance, GOHM_DECIMALS);

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Create a new voting power snapshot for the delegatee
  const votingPowerSnapshot = createVoterVotingPowerSnapshot(
    event.params.delegate,
    event,
  );
  voter.latestVotingPowerSnapshot = votingPowerSnapshot.id;
  voter.save();
}
