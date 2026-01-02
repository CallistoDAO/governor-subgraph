import { log } from "@graphprotocol/graph-ts";
import { DelegateVotesChanged } from "../generated/gOHM/gOHM";
import { Voter, VoterVotingPowerSnapshot } from "../generated/schema";
import { toDecimal } from "./utils/number";
import { GOHM_DECIMALS } from "./constants";

export function createVoterVotingPowerSnapshot(
  voter: Voter,
  event: DelegateVotesChanged,
): VoterVotingPowerSnapshot {
  log.info("Creating voter voting power snapshot for delegatee: {}", [
    event.params.delegate.toHexString(),
  ]);
  const snapshot = new VoterVotingPowerSnapshot(
    event.params.delegate
      .concatI32(event.block.number.toI32())
      .concatI32(event.logIndex.toI32()),
  );

  snapshot.votingPower = toDecimal(event.params.newBalance, GOHM_DECIMALS);
  log.info("Voting power set for delegatee: {} = {}", [
    event.params.delegate.toHexString(),
    snapshot.votingPower.toString(),
  ]);
  log.info("Previous voting power for delegatee: {} = {}", [
    event.params.delegate.toHexString(),
    toDecimal(event.params.previousBalance, GOHM_DECIMALS).toString(),
  ]);

  snapshot.voter = voter.id;

  snapshot.blockNumber = event.block.number;
  snapshot.blockTimestamp = event.block.timestamp;
  snapshot.save();

  log.info("Saved VoterVotingPowerSnapshot record for delegatee: {}", [
    event.params.delegate.toHexString(),
  ]);

  return snapshot;
}
