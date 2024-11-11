import { Address, BigDecimal, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { VoteDelegator, VoteDelegatorSnapshot } from "../generated/schema";
import { gOHM } from "../generated/gOHM/gOHM";
import { toDecimal } from "./utils/number";
import { GOHM_CONTRACT, GOHM_DECIMALS } from "./constants";

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

function _getGOhmBalance(address: Bytes): BigDecimal {
  const contract = gOHM.bind(Address.fromString(GOHM_CONTRACT));
  const balance = contract.balanceOf(Address.fromBytes(address));

  return toDecimal(balance, GOHM_DECIMALS);
}

export function createVoteDelegatorSnapshot(
  delegator: Bytes,
  delegatee: Bytes,
  event: ethereum.Event,
): VoteDelegatorSnapshot {
  const snapshot = new VoteDelegatorSnapshot(
    delegator
      .concatI32(event.block.number.toI32())
      .concatI32(event.logIndex.toI32()),
  );

  snapshot.delegator = getOrCreateVoteDelegator(delegator, delegatee).id;

  // Get the gOHM balance of the delegator
  const balance = _getGOhmBalance(delegator);
  snapshot.balance = balance;

  snapshot.blockNumber = event.block.number;
  snapshot.blockTimestamp = event.block.timestamp;

  snapshot.save();

  return snapshot;
}
