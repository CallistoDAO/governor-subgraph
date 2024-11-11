import { BigDecimal, Bytes } from "@graphprotocol/graph-ts";

import { ethereum } from "@graphprotocol/graph-ts";
import {
  VoteDelegator,
  VoteDelegatorSnapshot,
  Voter,
  VoterVotingPowerSnapshot,
} from "../generated/schema";
import { createVoteDelegatorSnapshot } from "./voteDelegator";

export function getOrCreateVoter(voter: Bytes): Voter {
  let entity = Voter.load(voter);

  if (!entity) {
    entity = new Voter(voter);
    entity.address = voter;

    entity.save();
  }

  return entity;
}

/**
 * Create a new voting power snapshot for a voter.
 *
 * In order to provide
 *
 * @param voter
 * @param event
 * @returns
 */
export function createVoterVotingPowerSnapshot(
  voter: Bytes,
  event: ethereum.Event,
): VoterVotingPowerSnapshot {
  const snapshot = new VoterVotingPowerSnapshot(
    voter
      .concatI32(event.block.number.toI32())
      .concatI32(event.logIndex.toI32()),
  );

  const voterEntity = getOrCreateVoter(voter);
  snapshot.voter = voterEntity.id;

  // Iterate over the vote delegators for the voter
  let votingPower = BigDecimal.fromString("0");
  const voteDelegators: VoteDelegator[] = voterEntity.delegators.load();
  const voteDelegatorSnapshotIds: Bytes[] = [];
  for (let i = 0; i < voteDelegators.length; i++) {
    const voteDelegator = voteDelegators[i];

    // Create a snapshot (with the gOHM balance) for the vote delegator
    const voteDelegatorSnapshot = createVoteDelegatorSnapshot(
      voteDelegator.holder,
      voteDelegator.delegatee,
      event,
    );
    voteDelegator.latestSnapshot = voteDelegatorSnapshot.id;
    voteDelegator.save();

    voteDelegatorSnapshotIds.push(voteDelegatorSnapshot.id);

    // Add the snapshot's voting power to the total voting power
    votingPower = votingPower.plus(voteDelegatorSnapshot.balance);
  }

  snapshot.votingPower = votingPower;
  snapshot.delegatorSnapshots = voteDelegatorSnapshotIds;

  snapshot.save();

  return snapshot;
}
