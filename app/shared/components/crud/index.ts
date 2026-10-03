/**
 * Shared CRUD UI kit (list / detail / add-edit form / delete confirmation).
 * Styling lives here and in shared/styles/uiTokens.ts — edit once, every
 * module that uses these components follows.
 */
export {ScreenContainer, CenteredLoader} from './ScreenContainer';
export {StatusBadge} from './StatusBadge';
export type {BadgeTone} from './StatusBadge';
export {
  ListToolbar,
  EntityListCard,
  CardMeta,
  ListEmptyState,
  ListPageBar,
  listContentStyle,
} from './ListParts';
export {DetailCard, DetailRow, DetailActions} from './DetailParts';
export {DeleteConfirmView} from './DeleteConfirmView';
export {FormField, FormSwitchRow, FormDivider, FormActions} from './FormParts';
