# Security Specification for SCA Karak

## Data Invariants
1. A **User** document role can only be set to "admin" if the user email is the authorized admin email (`mehaalkhan.2@gmail.com`).
2. **Lectures**, **Results**, **Notes**, and **Notifications** can only be created, updated, or deleted by an Admin.
3. Students can read `Lectures`, `Notes`, and `Notifications`.
4. Students can only read `Results` that belong to them (matched by email).
5. All timestamps must be server-generated.
6. All IDs must be valid (not too long, safe characters).

## The Dirty Dozen Payloads
1. **Malicious Admin Promotion**: A student tries to update their own role to "admin".
2. **Ghost Note**: Creating a note with a 1MB string in the title.
3. **Orphaned Result**: Creating a result without a subject.
4. **Identity Spoofing**: User A trying to read User B's private result.
5. **Unauthorized Lecture**: Non-admin trying to post a fake lecture link.
6. **Timeline Hijack**: Sending a notification with a date in the future (client-provided).
7. **Role Escalation via Creation**: New user trying to register with `role: 'admin'`.
8. **Shadow Field**: Adding a hidden `isVerified: true` field to a user profile.
9. **Junk ID Poisoning**: Trying to create a doc with a 2KB ID string.
10. **Delete All**: Student trying to delete the entire lectures collection.
11. **Update PII**: User trying to change another user's email field.
12. **Blind List Query**: Trying to list all results without a filter, hoping the rules leak other students' data.

## Test Runner (Logic Overview)
The `firestore.rules` will be tested against these invariants using the standard Firebase simulator logic. I will verify that `PERMISSION_DENIED` is returned for all unauthorized cases.
