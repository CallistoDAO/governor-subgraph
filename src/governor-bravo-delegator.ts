import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  NewAdmin as NewAdminEvent,
  NewImplementation as NewImplementationEvent,
  NewPendingAdmin as NewPendingAdminEvent,
  ProposalCanceled as ProposalCanceledEvent,
  ProposalCreated as ProposalCreatedEvent,
  ProposalExecuted as ProposalExecutedEvent,
  ProposalQueued as ProposalQueuedEvent,
  ProposalThresholdSet as ProposalThresholdSetEvent,
  ProposalVetoed as ProposalVetoedEvent,
  ProposalVotingStarted as ProposalVotingStartedEvent,
  VetoGuardianSet as VetoGuardianSetEvent,
  VoteCast as VoteCastEvent,
  VotingDelaySet as VotingDelaySetEvent,
  VotingPeriodSet as VotingPeriodSetEvent,
  WhitelistAccountExpirationSet as WhitelistAccountExpirationSetEvent,
  WhitelistGuardianSet as WhitelistGuardianSetEvent,
} from "../generated/GovernorBravoDelegator/GovernorBravoDelegator";
import {
  NewAdmin,
  NewImplementation,
  NewPendingAdmin,
  ProposalCanceled,
  ProposalCreated,
  ProposalExecuted,
  ProposalQueued,
  ProposalThresholdSet,
  ProposalVetoed,
  ProposalVotingStarted,
  VetoGuardianSet,
  VoteCast,
  VotingDelaySet,
  VotingPeriodSet,
  WhitelistAccountExpirationSet,
  WhitelistGuardianSet,
} from "../generated/schema";
import { getOrCreateVoter } from "./voter";
import { GOHM_DECIMALS } from "./constants";
import { toDecimal } from "./utils/number";

export function handleNewAdmin(event: NewAdminEvent): void {
  let entity = new NewAdmin(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.oldAdmin = event.params.oldAdmin;
  entity.newAdmin = event.params.newAdmin;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleNewImplementation(event: NewImplementationEvent): void {
  let entity = new NewImplementation(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.oldImplementation = event.params.oldImplementation;
  entity.newImplementation = event.params.newImplementation;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleNewPendingAdmin(event: NewPendingAdminEvent): void {
  let entity = new NewPendingAdmin(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.oldPendingAdmin = event.params.oldPendingAdmin;
  entity.newPendingAdmin = event.params.newPendingAdmin;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

function _assertProposalExists(id: BigInt): void {
  let proposal = ProposalCreated.load(id.toString());

  if (!proposal) {
    throw new Error("Proposal not found with id: " + id.toString());
  }
}

export function handleProposalCanceled(event: ProposalCanceledEvent): void {
  let entity = new ProposalCanceled(event.params.id.toString());
  entity.proposalId = event.params.id;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  _assertProposalExists(event.params.id);
  entity.proposal = event.params.id.toString();

  entity.save();
}

export function handleProposalCreated(event: ProposalCreatedEvent): void {
  let entity = new ProposalCreated(event.params.id.toString());
  entity.proposalId = event.params.id;
  entity.proposer = getOrCreateVoter(event.params.proposer).id;
  entity.targets = event.params.targets.map<Bytes>((target: Bytes) => target);
  entity.values = event.params.values;
  entity.signatures = event.params.signatures;
  entity.calldatas = event.params.calldatas;
  entity.startBlock = event.params.startBlock;
  entity.description = event.params.description;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleProposalExecuted(event: ProposalExecutedEvent): void {
  let entity = new ProposalExecuted(event.params.id.toString());
  entity.proposalId = event.params.id;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  _assertProposalExists(event.params.id);
  entity.proposal = event.params.id.toString();

  entity.save();
}

export function handleProposalQueued(event: ProposalQueuedEvent): void {
  let entity = new ProposalQueued(event.params.id.toString());
  entity.proposalId = event.params.id;
  entity.eta = event.params.eta;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  _assertProposalExists(event.params.id);
  entity.proposal = event.params.id.toString();

  entity.save();
}

export function handleProposalThresholdSet(
  event: ProposalThresholdSetEvent,
): void {
  let entity = new ProposalThresholdSet(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.oldProposalThreshold = event.params.oldProposalThreshold;
  entity.newProposalThreshold = event.params.newProposalThreshold;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleProposalVetoed(event: ProposalVetoedEvent): void {
  let entity = new ProposalVetoed(event.params.id.toString());
  entity.proposalId = event.params.id;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  _assertProposalExists(event.params.id);
  entity.proposal = event.params.id.toString();

  entity.save();
}

export function handleProposalVotingStarted(
  event: ProposalVotingStartedEvent,
): void {
  let entity = new ProposalVotingStarted(event.params.id.toString());
  entity.proposalId = event.params.id;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  _assertProposalExists(event.params.id);
  entity.proposal = event.params.id.toString();

  entity.save();
}

export function handleVetoGuardianSet(event: VetoGuardianSetEvent): void {
  let entity = new VetoGuardianSet(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.oldGuardian = event.params.oldGuardian;
  entity.newGuardian = event.params.newGuardian;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleVoteCast(event: VoteCastEvent): void {
  let entity = new VoteCast(
    `${event.params.proposalId.toString()}-${event.params.voter.toHexString()}-${event.transaction.hash.toHexString()}-${event.logIndex.toI32()}`,
  );
  entity.voter = getOrCreateVoter(event.params.voter).id;
  entity.proposalId = event.params.proposalId;
  entity.support = event.params.support;
  entity.votes = toDecimal(event.params.votes, GOHM_DECIMALS);
  entity.reason = event.params.reason;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  _assertProposalExists(event.params.proposalId);
  entity.proposal = event.params.proposalId.toString();

  entity.save();
}

export function handleVotingDelaySet(event: VotingDelaySetEvent): void {
  let entity = new VotingDelaySet(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.oldVotingDelay = event.params.oldVotingDelay;
  entity.newVotingDelay = event.params.newVotingDelay;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleVotingPeriodSet(event: VotingPeriodSetEvent): void {
  let entity = new VotingPeriodSet(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.oldVotingPeriod = event.params.oldVotingPeriod;
  entity.newVotingPeriod = event.params.newVotingPeriod;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleWhitelistAccountExpirationSet(
  event: WhitelistAccountExpirationSetEvent,
): void {
  let entity = new WhitelistAccountExpirationSet(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.account = event.params.account;
  entity.expiration = event.params.expiration;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleWhitelistGuardianSet(
  event: WhitelistGuardianSetEvent,
): void {
  let entity = new WhitelistGuardianSet(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.oldGuardian = event.params.oldGuardian;
  entity.newGuardian = event.params.newGuardian;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
