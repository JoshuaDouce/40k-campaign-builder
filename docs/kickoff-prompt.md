I want to turn my Warhammer 40k campaign prototype into a real web app hosted on AWS,
with user sign-up and sign-in so my gaming group can share one live campaign.

Read CLAUDE.md first. It's the project brief: stack, data model, MVP features and
rules for working. Then read reference/index.html, the working prototype. It holds
all the game rules and logic, and the look I want to keep.

Work in this order and stop for my OK at the end of each stage:

1. **Plan.** Summarise how you'll split the prototype into a game module, React
   components and the Amplify backend. List anything in the brief you think is wrong
   or missing. List what I need to set up on my side (AWS account, AWS CLI profile,
   GitHub repo, Node version).

2. **Game module.** Port the prototype's logic to pure TypeScript in src/game/ with
   unit tests (Vitest). Cover the map generator, targets(), battleInfo() and
   resolve(), plus a full simulated War Round with 3 players.

3. **Frontend, local only.** Vite + React app using the game module, with state still
   in localStorage. It should look and behave like the prototype. Run it so I can
   check it in my browser.

4. **Backend in a sandbox.** Add Amplify Gen 2: Cognito auth with the Authenticator
   component, the Campaign and Profile models, the joinCampaign function, saves with
   optimistic concurrency, and live updates. Test it in `npx ampx sandbox`. Show me
   how to sign up two test users and play a turn between them.

5. **Deploy.** Walk me through connecting the GitHub repo to Amplify Hosting, then
   check the live site works. Help me set up an AWS Budgets alert at £5 a month.

Explain AWS steps in plain language. I'm comfortable following instructions but
I'm not an AWS expert. Keep the setup as simple as you can.
