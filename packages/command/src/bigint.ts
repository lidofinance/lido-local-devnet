// bigint patch
// eslint-disable-next-line no-extend-native
(BigInt as any).prototype.toJSON = function() {
  return this.toString();
};
