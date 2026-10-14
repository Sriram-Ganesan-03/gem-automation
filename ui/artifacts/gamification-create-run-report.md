# Gamification Creation Playwright Report

| Field | Result |
|---|---|
| Execution | **PASSED** |
| Run date | 2026-10-13 |
| Application | Chickasaw Playerhub (`https://chickasaw-dev.playerhub.ai`) |
| Scenario source | `ui/input.txt` |
| Created game | `this is for testing` |
| Prize count | 2 |
| Playwright tests | 1 passed, 0 failed |
| Duration | 13.4 seconds |
| Run video | [video.webm](./gamification-test-results/gamification-create-create-94569-cation-game-with-two-prizes/video.webm) |

## Verified steps

| Check | Result |
|---|---|
| Signed in and reached the dashboard | Passed |
| Opened GEM → Configurations → Gamification | Passed |
| Opened the Create New Gamification Game page | Passed |
| Entered the game name and two prize labels | Passed |
| Entered and retained a valid image URL for both prizes | Passed |
| Verified the prize count, values, and Remove controls | Passed |
| Added a third prize and removed it; count returned to two | Passed |
| Saved the game and found it in the Gamification listing | Passed |

The direct-login fields were already visible at the login page, so the test only clicks “Use Direct Login” when those fields are hidden.

## Playwright output

- [HTML report](./gamification-playwright-report/index.html)
- [Run video](./gamification-test-results/gamification-create-create-94569-cation-game-with-two-prizes/video.webm)
- [JSON results](./gamification-test-results/results.json)
- [JUnit results](./gamification-test-results/junit.xml)
- Test: [gamification-create.spec.ts](./tests/specs/gamification-create.spec.ts)
