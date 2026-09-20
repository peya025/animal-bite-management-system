# Deployment branch workflow

Use `deployment` as the branch connected to the Railway and Vercel test deployments. Keep `main` as the stable branch. Railway and Vercel read a GitHub branch directly, so deploying `deployment` does not require merging it into `main`.

## Current repository state

As checked locally on 2026-09-20, `deployment` already exists and is the current branch. It is one commit ahead of the locally recorded `origin/deployment`, while local `main` matches the locally recorded `origin/main`. The working tree also has uncommitted deployment changes. GitHub could not be reached during this check, so fetch before relying on the remote branch positions. Do **not** run `git switch -c deployment` in this checkout; the branch already exists.

## Create the branch in a repository where it does not yet exist

Run this sequence only if `deployment` is absent and the working tree is clean:

```bash
git switch main
git pull --ff-only origin main
git switch -c deployment
git push -u origin deployment
```

`git pull --ff-only` stops if local `main` has diverged; resolve that case deliberately before creating the branch. The new branch starts at the latest fetched `main` commit. Creating and pushing it does not change `main`.

## Next steps in this repository

First confirm the active branch and inspect exactly what will be committed:

```bash
git branch --show-current
git status --short
git diff
git diff --cached
git ls-files backend/.env frontend/.env mobile/.env
```

The last command should print nothing. Review all changed files for secrets and local-only content. Stage only the intended deployment files, then review the staged content before committing:

```bash
git add backend frontend mobile tasks
git diff --cached --stat
git diff --cached
git commit -m "Prepare deployment branch for Railway and Vercel"
git push -u origin deployment
```

If unrelated changes appear in the staged review, unstage those individual paths with `git restore --staged <path>` before committing. Keep real `.env` files, database dumps, `APP_KEY`, passwords, tokens, and patient data out of Git. Do not push until the staged review is clean. The current branch has not been pushed by this guide.

## Continue work on `deployment`

For later deployment changes:

```bash
git switch deployment
git pull --ff-only origin deployment
git status --short
# Edit and test the needed files.
git add <paths-you-reviewed>
git diff --cached
git commit -m "Describe the deployment change"
git push origin deployment
```

If `main` gains changes that `deployment` needs, update `deployment` only:

```bash
git fetch origin
git switch deployment
git merge origin/main
# Resolve conflicts and run the relevant tests if Git reports any conflicts.
git push origin deployment
```

The merge above brings stable changes *into* `deployment`; it does not move `main`.

Compare the branches at any time:

```bash
git fetch origin
git log --oneline origin/main..deployment
git diff --stat origin/main...deployment
git diff origin/main...deployment
```

The log lists commits present only on `deployment`. The three-dot diff shows changes made since the branches split.

## Railway: deploy the branch

1. In the Railway test project, open the Laravel service, then **Settings → Source**. Connect the GitHub repository `peya025/animal-bite-management-system` if it is not connected already.
2. Set the connected/trigger branch to `deployment`, confirm the service root directory is `backend`, and enable automatic deployments if desired. If there is a separate scheduler service, connect it to the same repository and `deployment` branch as well.
3. After a push, open the service's deployment history and confirm the deployed commit SHA matches `git rev-parse deployment`. Confirm the MySQL service and the Laravel service are healthy.

Railway builds the branch configured for each service when that branch receives a commit. Check every service that reads this repository; a scheduler left on `main` would run different code. See [Railway's GitHub autodeploy guide](https://docs.railway.com/deployments/github-autodeploys) and [service source settings](https://docs.railway.com/services).

## Vercel: deploy the branch

1. Import the same GitHub repository into a **separate Vercel test project** if a live project already serves `main`. Set the Root Directory to `frontend`.
2. In the test project's **Settings → Environments → Production → Branch Tracking**, set the production branch to `deployment` and save. This gives the test project a stable deployment URL that updates on pushes to `deployment`.
3. Set the test project's Vercel environment variables, including `VITE_API_URL` for the Railway test API. After a push, confirm the Vercel deployment shows the expected `deployment` commit SHA.

If there is no existing live Vercel project, the same branch setting can be used on the new project. Changing the production branch on an existing live project also changes what its production domain serves, so use a separate test project when `main` must keep serving that domain. Vercel documents the [production branch setting](https://vercel.com/docs/git#production-branch) and [GitHub branch deployments](https://vercel.com/docs/git/vercel-for-github).

## Test before merging

Record the deployed commit SHA and check each item against the Railway and Vercel test URLs:

- [ ] Laravel backend responds online without deployment errors.
- [ ] Laravel connects to the fresh MySQL database; migrations and required initial seed data are present.
- [ ] API endpoints return expected responses and enforce authorization.
- [ ] Staff and patient authentication work.
- [ ] Patient registration works.
- [ ] The patient first-come-first-served queue works through registration, serving, and completion.
- [ ] Doctor and nurse workflows work with their respective accounts.
- [ ] Vaccination schedules display and update correctly.
- [ ] In-app notifications appear for their intended recipients.
- [ ] The mobile app connects to the Railway API and completes its key flows.
- [ ] Railway and Vercel logs show no deployment or runtime errors.

The detailed application deployment checklist is in [railway_vercel_mobile_deployment_checklist.md](railway_vercel_mobile_deployment_checklist.md). Keep the test services on `deployment` while these checks are incomplete.

## Merge only after all checks pass

Confirm a clean working tree and that the tested deployment SHA is the branch tip. Then:

```bash
git status --short
git fetch origin
git switch main
git pull --ff-only origin main
git merge --no-ff deployment
# Run the relevant tests again if main gained commits or the merge required conflict resolution.
git push origin main
```

If `main` advanced after testing, merge `origin/main` into `deployment`, redeploy, and repeat the checklist before this final merge. Merging does not automatically switch either hosting project's configured branch; change those settings separately only when you intentionally want them to follow `main`.
