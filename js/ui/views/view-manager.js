/**
 * @module ui/views/view-manager
 * @description Gerenciador de views principais
 * @dependencies Nenhuma
 * @exports setActiveView, getActiveView
 */

let currentView = 'chat';

export function setActiveView(viewName) {
  currentView = String(viewName || 'chat');
}

export function getActiveView() {
  return currentView;
}
