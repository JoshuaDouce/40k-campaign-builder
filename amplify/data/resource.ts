import { a, defineData } from "@aws-amplify/backend";
import type { ClientSchema } from "@aws-amplify/backend";
import { yellowscribe } from "../functions/yellowscribe/resource.js";

const schema = a.schema({
  /**
   * One shared campaign: the whole game state is one JSON document (see CLAUDE.md).
   * `members` holds lowercase emails of the people allowed in. The `admins` group (the organiser)
   * can do everything; a member can read and update. Only admins can create or delete.
   */
  Campaign: a
    .model({
      name: a.string().required(),
      members: a.string().array().required(),
      state: a.json().required(),
      version: a.integer().required(),
    })
    .authorization((allow) => [
      allow.group("admins"),
      allow.ownersDefinedIn("members").identityClaim("email").to(["read", "update"]),
    ]),

  /** Fetch an uploaded army from yellowscribe.link by its 8-character code (Tabletop Simulator export). */
  yellowscribeArmy: a
    .query()
    .arguments({ code: a.string().required() })
    .returns(a.json())
    .handler(a.handler.function(yellowscribe))
    .authorization((allow) => [allow.authenticated()]),

  /** Post the edited army (a JSON string) back to yellowscribe.link and return `{ code }` for Tabletop Simulator. */
  yellowscribePost: a
    .mutation()
    .arguments({ payload: a.string().required() })
    .returns(a.json())
    .handler(a.handler.function(yellowscribe))
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: "userPool" },
});
