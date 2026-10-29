import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource.js";
import { data } from "./data/resource.js";
import { yellowscribe } from "./functions/yellowscribe/resource.js";

const backend = defineBackend({ auth, data, yellowscribe });

// No self sign-up: only the organiser creates logins, with the AWS CLI (docs/organiser.md).
backend.auth.resources.cfnResources.cfnUserPool.adminCreateUserConfig = {
  allowAdminCreateUserOnly: true,
};
