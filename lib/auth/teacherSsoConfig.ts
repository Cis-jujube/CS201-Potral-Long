const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

export const DEFAULT_TEACHER_SSO_BASE_URL = "http://repolab.colab.duke.edu:8005";
export const DEFAULT_TEACHER_SSO_CLIENT_ID = "cs201-portal";

const isEnabled = (value: string | undefined) => TRUE_VALUES.has(value?.trim().toLowerCase() ?? "");

export const getTeacherSsoBaseUrl = () =>
  (process.env.TEACHER_SSO_BASE_URL || DEFAULT_TEACHER_SSO_BASE_URL).replace(/\/+$/, "");

export const getTeacherSsoClientId = () =>
  process.env.TEACHER_SSO_CLIENT_ID || DEFAULT_TEACHER_SSO_CLIENT_ID;

export const getTeacherSsoClientSecret = () => process.env.TEACHER_SSO_CLIENT_SECRET || "";

export const isTeacherSsoConfigured = () =>
  Boolean(getTeacherSsoBaseUrl() && getTeacherSsoClientId() && getTeacherSsoClientSecret());

export const isTeacherSsoRequired = () => isEnabled(process.env.CS201_REQUIRE_TEACHER_SSO);
