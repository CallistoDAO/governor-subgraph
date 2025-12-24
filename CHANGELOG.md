# Changelog

## 0.9.9

- Add `DelegateEscrowFactory` integration for Cooler V2 delegation tracking
- Add `DelegateEscrow` entity to track escrow contracts and their delegates
- Add `CoolerDelegation` entity to track user delegations through Cooler V2

## 0.0.5

- Modifies the schema to have proposal entities use the proposal ID as the record ID
- Links votes to the `ProposalCreated` entity

## 0.0.3

- Fix incorrect record id in `ProposalCreated` entity
