/**
 * The Globe's shared building blocks (Globe UI plan, prompt 4; the Studio's
 * look since 2026-10-29): one surface, one heading, a white pill for the main
 * action, hairline pills for the rest and the rails' pill zones. Radii:
 * `rounded-xl` for panels and the stage, `rounded-[0.625rem]` for popovers,
 * `rounded-lg` for rows and thumbnails, `rounded-full` for pills, chips and
 * icon buttons. Colours come from the `atlas-*` tokens
 * (src/components/atlas/theme/tokens.ts).
 */
export { AtlasChip } from './AtlasChip';
export { AtlasEyebrow } from './AtlasEyebrow';
export { AtlasIconButton } from './AtlasIconButton';
export { AtlasPanel, AtlasPanelBody } from './AtlasPanel';
export { AtlasPillButton } from './AtlasPillButton';
export * from './styles';
