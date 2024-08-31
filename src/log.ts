const LOG_ENABLE = true;

export default function log(...args: any[]) {
  if (!LOG_ENABLE) {
    return;
  }
  console.log(...args);
}