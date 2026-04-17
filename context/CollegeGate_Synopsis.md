**Jaganath International Management School**

**Vasant Kunj, New Delhi-110070**

Affiliated to Guru Gobind Singh Indraprastha University, New Delhi) Recognized u/s 2(f) by UGC & Accredited with ‘A+’ Grade by NAAC **NIRF Rank Band 201-300 under College** Category Participant of UNGC New York and ISO 9001:2015 Quality Certified 

**MAJOR PROJECT REPORT**

**“CollegeGate — Campus Outpass & Visitor System”**

Submitted In Partial Fulfilment of The Requirements

For The Award of The Degree Of

**Bachelor Of Computer Applications**

Session \[Jan-June 2026\]  
SEMESTER- VI

| Under the guidance of Mrs Radhika Sharma Assistant Professor – IT Department Jims, Vasant Kunj | Submitted by: Member 1 – Maanas Chandra \[00921402023\] Member 2 \- Aditya Jain \[00721402023\] BCA Sem-VI |
| :---- | :---- |

**TABLE OF CONTENTS**

| S. No. | Topic | Page No. |
| :---: | ----- | :---: |
| 1\. | Introduction | 3 |
| 2\. | Why Was This Topic Chosen? | 4 |
| 3\. | Objectives and Scope | 6 |
| 4\. | Methodology | 7 |
| 5\. | Technology Stack | 8 |
| 6\. | Testing Technologies Used | 10 |
| 7\. | Limitations and Future Scope | 11 |
| 8\. | Team Work Distribution | 12 |
| 9\. | Conclusion | 14 |

#                         **1\. INTRODUCTION**

Walk into any college hostel or campus building after 6 PM and you will find a fat paper register sitting at the gate. Students sign it going out. Sometimes they sign it coming back. Mostly they do not. The security guard tries to track who is still outside but after thirty or forty entries on a busy evening, the register becomes impossible to read. Nobody has a real-time picture of who is outside, where they went, or when they are expected back.

That is the system running in most colleges right now. A paper register, a phone call to the warden if something seems off, and nothing connecting the two people who need to be connected: the student, the faculty approver, and the security guard at the gate. When a parent calls at 9 PM to ask about their child, nobody has a clean answer. When the warden wants to know who is still outside, someone has to flip through pages of messy handwriting under dim light.

We built CollegeGate to replace that register. It is a web-based system where students submit outpass requests, faculty or wardens approve or reject them with remarks, and security guards mark entry and exit by scanning a QR code at the gate. Everyone works off the same live data. The admin gets reports. Nobody is left guessing.

## **1.1 Problem Statement**

### **What Students Deal With:**

1. There is no standard way to request permission to go out. Some students call the warden directly. Others walk to the faculty office. There is no process and no record.

2. After getting verbal approval, there is no written proof. If something goes wrong later, the student has nothing to show.

3. Emergency outpass situations are stressful. There is no fast digital channel to reach the warden when they are busy or unavailable.

4. Students cannot check the status of a request they submitted. They have to physically go and ask someone in person.

5. There is no QR pass or document at the gate, so security sometimes stops students even after the warden has given approval.

### **What Wardens and Faculty Deal With:**

1. Pending requests come in through WhatsApp, phone calls, and in-person visits all at the same time with no organized queue to manage them.

2. No record of a student's outpass history. Before approving, a warden cannot quickly see how many times the student has gone out this month.

3. No way to attach conditions like "return by 8 PM" in a form that automatically reaches the security guard at the gate.

4. Late returns are noticed only when the guard manually checks the register at night and then calls the warden to report it.

### **What Security Guards Deal With:**

1. Cannot verify if a student actually has permission to leave without making a phone call to the warden first.

2. No live list of students currently outside. The paper register does not update in real time and becomes unreadable after a busy shift.

3. No alert or flag for students who have crossed their allowed return time without any notification.

CollegeGate handles the complete outpass cycle in one place. A student submits a request from their phone. The warden approves it with a remark if needed. The student gets a QR pass. The guard scans it at the gate, marks exit, and marks return when the student comes back. The admin sees everything as it happens and can export reports at any time. We kept the design simple because we did not want to build something that nobody would actually use.

#                      **2\. WHY WAS THIS TOPIC CHOSEN?**

One of us stayed in a hostel last year. Going out on a weekend meant a phone call to the warden, then waiting to hear back, then signing a register that nobody ever looked at again. One evening there was a family emergency and it took almost forty minutes to get verbal approval because the warden was in a meeting. That experience stuck with us. It felt like something a basic digital system could fix in ten seconds, and it seemed strange that nothing like that existed.

## **2.1 What We Noticed Was Missing**

We looked at how outpass processes worked in a few colleges around us. Every single one used some version of the same thing: a paper register and phone calls. Some had started using Google Forms for requests, but approvals still happened over WhatsApp and the security guard at the gate was never part of that loop. There was no single place where the student, the warden, and the guard were all working off the same data. Information got passed around manually and things fell through the gaps. That gap felt obvious once we started looking at it carefully.

We also noticed that the security guard module was the part every other system ignored. Most attempts to digitize outpasses focused on the warden side but left the gate unchanged. The guard still had no way to verify a pass or know who was expected back and when. We specifically wanted to close that loop.

## **2.2 Why a Digital System Makes Sense Here**

The core problem is not complicated. It is a request and approval flow with a check-in and check-out step at the end. That is exactly the kind of thing a web app handles well. QR codes make the gate process instant. Role-based login means each person sees only what they need. The admin panel lets the institution track patterns over time, like which students frequently use emergency passes or which days have the highest outpass volume. None of that is possible with a paper register no matter how neatly it is maintained.

We also made a deliberate decision to build this as a mobile-first web app rather than trying to create a separate Android application. Wardens do not sit at a computer all day. Guards are standing at a gate. The whole system had to work on a phone screen. We kept that as a constraint from the beginning and it influenced every design decision we made.

## **2.3 What We Got Out of Building This**

None of us had built a multi-role system before. Having student, faculty, guard, and admin each log into the same app and land on completely different dashboards was a new kind of problem. We had done basic Firebase work before in class, but handling role-based access properly, generating QR codes tied to database records, making the scanner work on phone cameras, and wiring up real-time Firestore listeners were all things we figured out during this project. It was harder than expected. That is also why it felt genuinely worth doing.

# **3\. OBJECTIVES AND SCOPE**

The main things we wanted the app to do:

1. Build a student module where students can submit an outpass request with date, departure time, expected return time, and reason, and mark an emergency flag for urgent situations.

2. Automatically generate a QR code pass once a warden approves a request, so the student can show it at the gate without any further action or phone calls needed.

3. Create a faculty and warden dashboard showing all pending requests with approve and reject options, a remarks field for conditions like "return by 8 PM", and access to the student's full outpass history before deciding.

4. Set up a security guard interface where guards can scan a student's QR code to log exit time and later mark return, and see a live list of who is currently outside the campus.

5. Add a late return flag that highlights students who have not come back by their allowed time on both the warden and guard dashboards.

6. Build an admin panel with full user management for all four roles, configurable campus rules like maximum outpass duration and curfew timings, daily and weekly analytics, and report export in PDF and CSV formats.

7. Deploy the complete system using Next.js on Firebase Hosting so the app loads fast on mobile devices and works without needing a separate native application.

## **3.1 What the System Covers**

CollegeGate handles the full outpass cycle for a single institution. Four roles can log in: students, faculty or wardens, security guards, and admins. Students request and track their own passes. Faculty approve or reject with remarks. Guards handle the physical gate by scanning and logging. Admins manage all users, configure campus rules, and export reports. Every action is recorded in Firestore, so a complete history is always available for any request from creation to return.

We kept the scope focused on one college deployment at a time and deliberately left visitor management for external guests out of this version. The four-role outpass flow was already complex enough, and we wanted to get each part right before expanding the scope. Multi-college support and a visitor module are planned for a future version.

# **4\. METHODOLOGY**

We did not follow any textbook development methodology. No Scrum board, no formal sprints. What we did was break the work into four phases and finish each one before moving to the next. We also used Claude AI and GitHub Copilot while writing code, which saved a lot of time, especially on Firestore security rules and the QR scanner integration where neither of us had prior experience.

## **4.1 Requirement Gathering**

We started by writing down every pain point we knew from personal experience with hostel outpass processes. Then we spoke to two seniors who had been hostel representatives at their colleges. They confirmed most of our list and added things we had not thought about, like the warden needing to see a student's past outpass frequency before approving a new one, and the importance of the late return flag for night security. We also looked at how a few other colleges handled outpasses based on conversations and Instagram posts from hostel students. Not very scientific, but it gave us a clear picture of what was missing.

## **4.2 System Design**

Once we knew what to build, we drew the Firestore database structure on paper. Five main collections: users, outpass requests, approvals, gate logs, and system config. Each outpass request gets a unique document ID and a status field that moves through pending, approved or rejected, exited, and returned. Gate logs reference the approved request ID and store exit and return timestamps separately. We also drew rough wireframes for all four dashboards before writing any code, just enough to agree on what pages existed and what data each one needed to show.

## **4.3 Development**

We set up Next.js first and then got Firebase Authentication working. Role-based routing was the first real challenge. Getting the app to redirect a logged-in student to the student dashboard and a guard to the guard interface on the same login flow took about two days to get right. After that we built the request form, the approval flow, and QR code generation in order. The QR scanner was the most frustrating piece. It worked fine on our laptops but behaved inconsistently on different Android phones. Some scanned instantly, others took several seconds, and one older phone barely worked at all. We had to adjust the html5-qrcode library settings for scan rate and resolution multiple times before it worked reliably in different lighting conditions.

## **4.4 Testing and Deployment**

We tested by creating accounts for all four roles and going through the full outpass cycle from start to finish. Student submits, warden approves, guard scans, return is marked, admin sees the log. We deliberately tried to break things: accessing a guard page while logged in as a student, submitting forms with empty required fields, scanning an invalid QR code. We found a few bugs this way. Then we asked one classmate outside the team to use the student side without instructions. She got confused by the status labels, so we rewrote them to be more descriptive. The final version was deployed using the Firebase CLI to Firebase Hosting with separate feature branches in GitHub throughout development.

# **5\. TECHNOLOGY STACK**

We picked tools based on two things: they had to be free or nearly free, well documented, and beginner-friendly enough that we could realistically use them without months of prior experience. Next.js and Firebase checked all those boxes for us.

## **5.1 Frontend**

* Next.js (React Framework) — Main frontend framework for all pages, routing, and role-based dashboard rendering. Next.js made it straightforward to protect routes based on user role and manage navigation between the four different dashboards without building a custom router from scratch.

* Bootstrap 5 — Gave us a responsive grid, form components, modals, cards, and navbars without requiring a lot of custom CSS. It kept the UI consistent and readable across all pages and made the mobile layout much easier to manage.

* CSS3 — Custom styles layered on top of Bootstrap for things like the QR scanner camera overlay, the request status badge colors that change based on approval state, and the late return highlight on the guard dashboard.

* JavaScript (ES6+) — All interactive logic including form validation, Firestore queries, real-time dashboard updates using onSnapshot listeners, and QR scanner controls are written in JavaScript inside the Next.js page components.

## **5.2 Backend and Database**

* Firebase Authentication — Handles all login, logout, and session management with email and password auth. User role is stored as a field in the Firestore users collection and read on login to decide which dashboard to load and which routes to allow.

* Firebase Firestore — NoSQL document database where all outpass requests, approvals, gate logs, and user profiles live. Real-time listeners using onSnapshot let the warden dashboard and guard interface update automatically when new documents are written, without any manual page refresh.

* Firebase Storage — Configured in the project architecture for document or image uploads linked to outpass requests. Mostly reserved for future expansion into visitor management.

* Firebase Hosting — Where the live app is deployed. Free SSL, CDN delivery, and deployment via the Firebase CLI made this the clear choice for a student project with no hosting budget.

## **5.3 Additional Libraries**

* html5-qrcode — Opens the device camera and reads QR codes in real time. Used in the security guard interface for scanning student passes. Getting this to work consistently across different Android devices was the most difficult technical part of the project.

* qrcode.js — Generates the QR code shown on a student's approved pass. Each code encodes the unique Firestore document ID of the outpass request, which the guard interface looks up on scan to verify and log the exit.

* jsPDF — Generates downloadable PDF reports in the admin panel for daily outpass summaries and late return logs that the warden or admin can save or print.

* EmailJS — Sends email notifications to students when their request is approved, rejected, or flagged as a late return, without requiring a custom backend server or server-side code.

## **5.4 Version Control and Deployment**

* Git and GitHub — Each feature had its own branch. We merged to main only after testing that feature end-to-end. The last week of integration produced more merge conflicts than the rest of the project combined.

* Firebase CLI — Used to deploy builds from the terminal to Firebase Hosting. Reliable and fast once the project configuration was set up at the start.

#        **6\. TESTING TECHNOLOGIES USED**

We did not use any automated testing framework. No Jest, no Cypress, nothing like that. Everything was done by hand. That is not ideal for a production system but for a two-person team on a deadline, manual testing was the realistic option. We covered every feature deliberately, tested edge cases, and did not just check the happy path.

## **6.1 Functional Testing**

We tested each feature individually before connecting it to anything else. For the outpass request form, we tried submitting with empty fields, past dates, return times set before the departure time, and very long text in the reason field. Validation caught most issues. We found one case where an empty date field failed silently instead of showing an error. That was a missing null check in the form handler, which we fixed once we tracked it down. For the warden approval flow, we tested approving with a blank remark, with a very long remark, and rejecting immediately after a request was submitted. All two paths worked correctly after a couple of small fixes.

## **6.2 Integration Testing**

The tricky part was making sure data flowed correctly across all four roles in the right order. Student submits, warden approves, student gets QR code, guard scans, exit is logged, return is logged, admin sees the complete record. We went through this cycle about a dozen times with test accounts. One bug showed up during integration: the guard scan was creating a gate log document in Firestore but not updating the status field on the original outpass request from "approved" to "exited." This meant the admin report was showing wrong counts. It took almost a full day to find. The root cause was a Firestore security rule that did not allow the guard role to write the status field in the outpass requests collection. We added a targeted write permission for that specific field and the issue went away.

## **6.3 Usability Testing**

We asked one classmate outside our team to use the student side of the app without any instructions and tell us what confused her. She got stuck in two places. The request status labels were too vague — "pending" did not make clear whether the request was waiting for warden review or waiting for gate scan. She also could not find the QR pass download button because it was below the fold on her small phone screen. We changed the labels to say "Awaiting Warden Approval", "Approved — Show at Gate", and "Completed", and moved the download button to appear above the QR code image. Both changes were obvious improvements in hindsight and neither of us had noticed the problem because we had been staring at the same screens for weeks.

## **6.4 Security Testing**

We wrote Firestore security rules so students can only read their own outpass documents, guards can update gate logs and outpass status fields but cannot touch approval records, and wardens can only access requests assigned to their student group. We tested these by trying to access other users' data through the browser console using the Firestore SDK while logged in with a different role account. Every attempt was blocked correctly. We also confirmed that an invalid QR code, meaning a code whose ID does not exist in the database, gets rejected with an error message at the guard scanner rather than silently passing the student through.

# **7\. LIMITATIONS AND FUTURE SCOPE**

## **7.1 What Does Not Work Yet**

We are not going to pretend the system is finished. Here is what it cannot do right now:

* The guard scanner needs an active internet connection. If the campus Wi-Fi drops at the gate, the guard cannot scan passes and has to go back to manual checking until the connection comes back.

* Push notifications are not configured. Students receive email updates when their status changes but there are no in-app alerts or mobile push notifications.

* The admin analytics are basic. Daily outpass counts are visible but there is no filter by date range, hostel block, student year, or request type. Custom report generation is not available in this version.

* Multi-college support is not built. The current deployment works for one institution at a time. Separate namespaces and admin panels for multiple colleges would require additional architecture.

* Visitor management for external guests is outside the scope of this version. Only registered students with accounts can use the outpass system.

* Auto-escalation on late returns is not active. The system flags late returns on the dashboards but does not automatically send a notification to the warden or admin when the deadline passes.

## **7.2 What We Would Add Next**

If we keep working on this after submission, here is the list:

* Offline mode for the guard scanner using service workers to save scans locally and sync to Firestore once the internet connection comes back.

* Firebase Cloud Messaging integration for push notifications so students get an instant alert on their phone when a request is approved or rejected.

* A visitor management module where external guests register at the gate, receive a time-limited QR pass, and their entire visit is logged in the same admin panel.

* Advanced admin analytics with custom date filters, hostel-wise and year-wise breakdowns, and proper CSV export for uploading to college management or ERP systems.

* Multi-college deployment support with separate Firestore namespaces and admin panels for each institution, all managed under a single super-admin account.

# **8\. TEAM WORK DISTRIBUTION**

Two of us worked on this. We split tasks based on who was more comfortable with which part, but the split was never rigid. During the final two weeks when everything had to come together, we were both touching each other's code. That caused a few merge conflicts on GitHub but it also meant no single part of the project was only one person's responsibility, which made debugging faster.

## **8.1 Maanas Chandra \[Member 1\] — Frontend and UI**

\[Member 1\] handled all the Next.js pages and Bootstrap layouts. The four role-based dashboards, the outpass request form, the status page with QR pass display, and the admin panel visuals were all their work. The hardest part was making the guard scanner camera overlay work correctly on mobile screens without cutting off the video feed or breaking the Bootstrap grid layout. That component was rewritten twice before it worked on both Android phones and laptop screens. They also added the live student count on the guard dashboard that updates in real time using Firestore onSnapshot, which was not in the original plan but turned out to be one of the most useful features in the whole app.

## **8.2 Aditya Jain \[Member 2\] — Backend and Database**

\[Member 2\] set up the entire Firebase project. They designed the Firestore collection structure, wrote all the queries for each of the four roles, and configured Authentication with custom role claims stored in user documents. Writing the security rules was the hardest part. Firestore rule syntax has unusual behavior around nested conditions and the error messages from the Firebase console are not always clear about what is actually failing. That part alone took two or four days of trial and error before all four roles had the correct read and write permissions. They also connected EmailJS and built the two notification templates for approval, rejection, and late return alerts.

## **8.4 What We Did Together**

Requirement gathering was done by two of us together. We sat down and listed out every feature, argued about what to include or cut, and came to an agreement before writing any code. The Firestore database structure was drawn on a whiteboard with all two of us present. During integration week, we had video calls every evening to fix bugs and make sure all four dashboards were talking to the same Firestore data correctly. The final presentation slides and live demo rehearsal were also prepared as a group. Merge conflicts on GitHub during that last week were a shared experience none of us want to repeat.

#                                 **9\. CONCLUSION**

The problem was simple to describe. College gates run on paper registers and phone calls. Nobody has a real-time view of who is outside. Wardens approve requests they cannot track once the student walks out. Security guards let students through without any way to verify a pass. two people need to be connected and the current system connects none of them. CollegeGate is what we built to fix that.

A student submits a request from their phone. The warden approves it and adds a remark. The student gets a QR pass. The guard scans it, logs exit, logs return. The admin sees all of it in one panel and can export a report. That loop did not exist before we built it. It does now, and it runs on the same data for all four roles simultaneously.

We learned more on this project than in two semesters of regular coursework combined. Role-based access control in Firebase, real-time Firestore listeners with onSnapshot, QR code generation and camera scanning on mobile devices, jsPDF for generating reports in the browser, and deploying a Next.js app through Firebase CLI were all new to us. We made mistakes. We fixed them. The Firestore rule bug that broke guard scans took a full day to find. The scanner component was rewritten from scratch twice. That is how we actually learned these tools.

Is the app perfect? No. Offline mode is not built. Push notifications are not live. The admin analytics are basic. If we started over knowing what we know now, we would design the Firestore collection structure slightly differently to make the guard queries cleaner. But the core flow works end-to-end. A student can request, a warden can approve, a guard can scan, and an admin can see the numbers. We tried to build something that would actually work at a real college gate. We think we managed to do that.

**\* \* \* End of Synopsis \* \* \***