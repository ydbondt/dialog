export let DialogCancelError = class DialogCancelError extends Error {

  constructor(cancellationReason = null) {
    super('Operation cancelled.');
    this.wasCancelled = true;
    this.reason = cancellationReason;
  }
};