/**
 * After a record is deleted or disabled, leave its detail (and edit) screens
 * and return to the list underneath, asking that list to reload.
 */
const RECORD_SCREENS = new Set([
  'User',
  'ChurchDetail',
  'EditChurch',
  'EditChurchLocation',
  'WorshipServiceDetail',
  'OverseerGoalDetail',
  'EditOverseerGoals',
  'EditOverseerGoalDefaults',
  'WatchListDetail',
  'WatchListForm',
  'ResourceDetail',
  'EditResource',
  'VisitDetail',
  'EditVisit',
  'EditVisitDetails',
  'FAQDetail',
  'EditFAQ',
  'EventTypeDetail',
  'EditEventType',
  'ChurchPlantingProjectionDetail',
  'EditChurchPlantingProjection',
  'RelatingDetails',
  'ChurchNetworkDetail',
]);

export function returnToList(navigation: {
  getState?: () => {index?: number; routes?: {name: string; params?: object}[]};
  popTo?: (name: string, params?: object) => void;
  navigate: (name: string, params?: object) => void;
  goBack: () => void;
}) {
  const state = navigation.getState?.();
  const routes = state?.routes ?? [];
  let targetIndex = (state?.index ?? routes.length - 1) - 1;

  while (targetIndex >= 0 && RECORD_SCREENS.has(routes[targetIndex]?.name)) {
    targetIndex -= 1;
  }

  const target = routes[targetIndex];
  if (!target) {
    navigation.goBack();
    return;
  }

  const params = {
    ...(target.params ?? {}),
    reload: true,
    refresh: true,
  };

  if (typeof navigation.popTo === 'function') {
    navigation.popTo(target.name, params);
    return;
  }

  navigation.navigate(target.name, params);
}

/**
 * After saving an edit, return to the screen that opened it and drop the edit
 * screen, so Back does not open the edit form again.
 */
export function returnAfterEdit(navigation: {
  getState?: () => {index?: number; routes?: {name: string; params?: object}[]};
  popTo?: (name: string, params?: object) => void;
  navigate: (name: string, params?: object) => void;
  goBack: () => void;
}) {
  const state = navigation.getState?.();
  const routes = state?.routes ?? [];
  const currentIndex = state?.index ?? routes.length - 1;
  const target = routes[currentIndex - 1];

  if (!target) {
    navigation.goBack();
    return;
  }

  const params = {
    ...(target.params ?? {}),
    reload: true,
    refresh: true,
    refetchKey: Date.now(),
  };

  if (typeof navigation.popTo === 'function') {
    navigation.popTo(target.name, params);
    return;
  }

  navigation.goBack();
}
