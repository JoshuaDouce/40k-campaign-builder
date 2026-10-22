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
