const LOG_ENABLE = false;

export default function log(...args: any[]) {
  if (!LOG_ENABLE) {
    return;
  }
  console.log(...args);
}
