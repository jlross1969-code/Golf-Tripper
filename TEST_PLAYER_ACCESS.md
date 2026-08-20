# Test Player Profiles and Finance Scenarios

## Access limitation

This application uses **Manus OAuth**, not local username-and-password authentication. The eight profiles below are seeded data records for player assignment and finance testing; they do **not** have passwords and cannot sign in independently with the listed email addresses.

To test a genuine player login, sign in through Manus OAuth with a real Manus account and invite or assign that account to a trip. The seeded profiles remain useful for roster, group, team, payment, supplier, expense, and leaderboard testing under the owner account.

## Seeded profiles

| Player | Seeded email | Handicap |
|---|---|---:|
| Ava Bennett | ava.bennett@example.test | 12.4 |
| Liam Carter | liam.carter@example.test | 7.8 |
| Mia Dalton | mia.dalton@example.test | 18.2 |
| Noah Ellis | noah.ellis@example.test | 9.7 |
| Olivia Grant | olivia.grant@example.test | 15.5 |
| Ethan Hall | ethan.hall@example.test | 4.6 |
| Ruby King | ruby.king@example.test | 21.0 |
| Jack Lewis | jack.lewis@example.test | 11.3 |

Each profile appears in all four seeded trips, together with the owner account.

## Finance testing scenarios

Every seeded trip includes four financial plan lines, two suppliers, three actual expenses, and eight player payment records. Six player payments are confirmed and two are submitted for organiser review.

| Trip | Approved actual expenses | Pending expense approvals | Supplier state |
|---|---:|---:|---|
| Harbour Links Test Weekend | $1,300.00 | 1 | One partial, one unpaid |
| Alpine Pairs Test Cup | $2,310.00 | 1 | One partial, one unpaid |
| Coastal Pennant Test Series | $1,550.00 | 1 | One partial, one unpaid |
| Mystery Greens Test Trip | $1,400.00 | 1 | One partial, one unpaid |

Use **Admin Panel → [Trip] → Trip Finances** to review payment confirmation and expense approval scenarios. Use **Financial Reports & Supplier Reminders** for supplier calendars, invoice workflow, finance reports, and budget warnings.
