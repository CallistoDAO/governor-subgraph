import { Bytes } from "@graphprotocol/graph-ts";

import { Voter } from "../generated/schema";

export function getOrCreateVoter(voter: Bytes): Voter {
  let entity = Voter.load(voter);

  if (!entity) {
    entity = new Voter(voter);
    entity.address = voter;

    entity.save();
  }

  return entity;
}
