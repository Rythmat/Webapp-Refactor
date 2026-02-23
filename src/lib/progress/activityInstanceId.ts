export interface BuildActivityInstanceIdParams {
  lessonId: string;
  lessonVersion: number;
  activityDefId: string;
  mode: string;
  root: string;
}

const normalize = (value: string) => value.trim().toLowerCase();

export const buildActivityInstanceId = ({
  lessonId,
  lessonVersion,
  activityDefId,
  mode,
  root,
}: BuildActivityInstanceIdParams) => {
  return [
    normalize(lessonId),
    `v${lessonVersion}`,
    normalize(activityDefId),
    normalize(mode),
    normalize(root),
  ].join('::');
};
