import { Address, Bytes } from "@graphprotocol/graph-ts";

import { Voter } from "../generated/schema";

export function getOrCreateVoter(voter: Address): Voter {
  if (voter.equals(Address.zero())) {
    throw new Error("Voter address cannot be zero");
  }

  let entity = Voter.load(voter);

  if (!entity) {
    entity = new Voter(voter);
    entity.address = voter;

    entity.save();
  }

  return entity;
}
