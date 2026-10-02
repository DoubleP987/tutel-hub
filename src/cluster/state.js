const clustered = Boolean(process.env.CLUSTER_NODE_ID);
let deadline = 0n;
export function clusterEnabled() {
  return clustered;
}
export function setLeaseDeadline(value) {
  deadline = value;
}
export function canRunBot() {
  return !clustered || process.hrtime.bigint() < deadline;
}
export function requireBotLease() {
  if (!canRunBot()) throw new Error('เครื่องนี้เป็นตัวสำรองหรือสิทธิ์การทำงานหมดอายุ');
}
