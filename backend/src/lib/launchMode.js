export function isRuakaLaunchModeEnabled() {
  return String(process.env.RUAKA_LAUNCH_MODE || "true").toLowerCase() !== "false";
}
