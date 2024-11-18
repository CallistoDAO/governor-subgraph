import { Bytes } from "@graphprotocol/graph-ts";
import { VoteDelegator } from "../generated/schema";

export function getOrCreateVoteDelegator(
  delegator: Bytes,
  delegatee: Bytes,
): VoteDelegator {
  let entity = VoteDelegator.load(delegator);
  if (entity == null) {
    entity = new VoteDelegator(delegator);
    entity.holder = delegator;
    entity.delegatee = delegatee;

    entity.save();
  }

  return entity;
}
