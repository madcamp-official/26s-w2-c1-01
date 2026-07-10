// 실제 백엔드가 준비되면 .env에서 VITE_ENABLE_MOCKS=false 로 끌 수 있습니다.
export function isMockingEnabled() {
  return import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS !== "false";
}

export async function enableMocking() {
  if (!isMockingEnabled()) return;

  const { worker } = await import("./browser");
  await worker.start({
    onUnhandledRequest: "bypass",
  });
}
