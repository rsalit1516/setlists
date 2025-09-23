/**
 * Represents the readiness status of a song
 */
export enum ReadinessStatus {
  /** Song is ready for performance */
  Ready = 'Ready',

  /** Song is being learned/practiced */
  InProgress = 'InProgress',

  /** Song is on the wish list to learn */
  WishList = 'WishList',
}
