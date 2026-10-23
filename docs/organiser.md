# Organiser guide

You are the organiser. You make every login, and you decide who is in each campaign.
Each command is one line, so it works in PowerShell and Git Bash. They use the AWS CLI with the `default` profile in London (`eu-west-2`).
Nothing here sends an email. You give your friend the temporary password yourself.

## 1. Find the user pool id
Either open `amplify_outputs.json` and copy `auth.user_pool_id`, or run:

```
aws cognito-idp list-user-pools --max-results 10 --region eu-west-2
```

It looks like `eu-west-2_AbCdEfGhI`. In the commands below, replace `POOL_ID` with it.

## 2. Create a login for a friend
Use a lowercase email. The temporary password needs 8+ characters with upper and lower case, a number and a symbol.

```
aws cognito-idp admin-create-user --region eu-west-2 --user-pool-id POOL_ID --username friend@example.com --user-attributes Name=email,Value=friend@example.com Name=email_verified,Value=true --temporary-password "Temp-Pass-123" --message-action SUPPRESS
```

Send them the site address, their email and the temporary password. On first sign-in they choose their own password.
Then add their email to the campaign: open the campaign, go to the Players tab, Members, Add.

## 3. Make yourself the organiser (once)
Create your own login the same way, then:

```
aws cognito-idp admin-add-user-to-group --region eu-west-2 --user-pool-id POOL_ID --username you@example.com --group-name admins
```

Sign out and back in for the change to show. Anyone in `admins` can create and delete campaigns and manage members.

## 4. Reset a password
Gives them a new temporary password; they choose their own at next sign-in.

```
aws cognito-idp admin-set-user-password --region eu-west-2 --user-pool-id POOL_ID --username friend@example.com --password "New-Temp-456"
```

Add `--permanent` to set it as their real password instead, with no forced change.
(Without `--permanent` the command makes it temporary.)

## 5. Delete a login

```
aws cognito-idp admin-delete-user --region eu-west-2 --user-pool-id POOL_ID --username friend@example.com
```

Their warband stays in any campaign until you use Remove player.

## Good to know
- Always use lowercase emails. Campaign access is matched on the email in the login.
- Removing a member in the app takes away their access, not their warband.
- Membership is honour-system: the app only lets you change members, but a member who knew how could edit the list through the API. Fine for friends.
- A campaign is one saved document (DynamoDB items are limited to 400 KB). The battle log is capped at 60 lines.

## Refreshing points
Unit points come from the community Munitorum Field Manual data. To pull the latest values, run this from the project folder, then commit the changed files in `src/data/mfm/`:

```
npm run update-points
```

It fetches `meta.yaml` and one file per faction from the `BSData/wh40k-11e-mfm` repo on GitHub and rewrites `src/data/mfm/*.json`. It stops with an error if the repo adds a faction we don't know about or a download fails. Running it twice in a row changes nothing.
Units already saved in a roster keep the points they were added with; only units added afterwards use the new values.
It needs Node 22.18 or later (it reads `src/data/mfm/slugs.ts` directly). If it stops because the repo added a faction, add that faction to `FACTIONS` in `src/game/data.ts` and to `src/data/mfm/slugs.ts` first.

Points data: BSData/wh40k-11e-mfm, MIT licence (copy in `src/data/mfm/LICENSE`).
