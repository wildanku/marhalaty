/** Returns the seller or God Mode management root for a specific store. */
export function storeManagementUrl(storeId: string): string {
  const godModeMatch = window.location.pathname.match(/^\/god-mode\/stores\/[^/]+\/manage/);

  return godModeMatch ? `/god-mode/stores/${storeId}/manage` : `/my/stores/${storeId}`;
}
