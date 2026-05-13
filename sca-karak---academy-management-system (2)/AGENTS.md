# Science Coaching Academy (SCA) Karak - App Instructions

## Admin Access
The user with email `mehaalkhan.2@gmail.com` is pre-configured as the **System Admin**. 
When you log in with this email, an "Admin" tab will appear in the navigation bar.

### Admin Capabilities:
- **Lectures**: Upload video titles and YouTube links.
- **Results**: Upload student exam results (student notifications are handled via the Results tab).
- **Notes**: Share PDF notes via public links.
- **Notifications**: Send academy-wide announcements and alerts.

## Student Access
All other users logging in with Google will automatically be assigned the **Student** role.
They can:
- Watch daily lectures.
- View their own personal exam results (matched by email).
- Download PDF notes.
- Stay updated with academy notifications.

## Database Security
The application uses strict Firestore Security Rules based on industry best practices.
- Students can only see their own results.
- Only Admins can modify content.
- All data is validated before storage.
