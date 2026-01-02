# Changelog

## 0.9.9

- Add `DelegateEscrowFactory` integration for Cooler V2 delegation tracking
- Add `DelegateEscrow` entity (immutable) to track escrow contracts and their delegates
- Add `CoolerDelegationEvent` entity (immutable) to track individual delegation events with user attribution
- Add `CoolerDelegationBalance` entity for running delegation totals per delegator-delegatee pair
- Add `coolerDelegations` derived field to `VoterVotingPowerSnapshot` for unified queries
- Link Cooler delegation events to `VoterVotingPowerSnapshot` for unified delegation model
- Skip `VoteDelegator` creation for escrow contracts (attribution handled by `CoolerDelegationEvent`)
- Improve schema documentation clarifying entity relationships

## 0.0.5

- Modifies the schema to have proposal entities use the proposal ID as the record ID
- Links votes to the `ProposalCreated` entity

## 0.0.3

- Fix incorrect record id in `ProposalCreated` entity
