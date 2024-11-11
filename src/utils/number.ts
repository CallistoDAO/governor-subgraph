import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export function toDecimal(value: BigInt, decimals: number): BigDecimal {
  const precision = BigInt.fromI32(10)
    .pow(<u8>decimals)
    .toBigDecimal();

  return value.divDecimal(precision);
}

export function toBigInt(value: BigDecimal, decimals: number): BigInt {
  const multiplier = BigInt.fromI32(10)
    .pow(<u8>decimals)
    .toBigDecimal();

  return BigInt.fromString(value.times(multiplier).toString());
}
