import { defineAuth } from "@aws-amplify/backend";

/**
 * Email + password logins, created by the organiser with the AWS CLI (see docs/organiser.md).
 * Self sign-up is switched off in backend.ts. The `admins` group marks the organiser.
 */
export const auth = defineAuth({
  loginWith: { email: true },
  // Campaign access is matched on email, so a signed-in user must not be able to change theirs.
  userAttributes: { email: { required: true, mutable: false } },
  groups: ["admins"],
});
